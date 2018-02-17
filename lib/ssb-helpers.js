const pull = require('pull-stream');
const collect = require('pull-stream/sinks/collect')
const take = require('pull-stream/throughs/take')
const filter = require('pull-stream/throughs/filter')
const map = require('pull-stream/throughs/map')
const asyncMap = require('pull-stream/throughs/async-map')
const drain = require('pull-stream/sinks/drain')
const reduce = require('pull-stream/sinks/reduce')
const markDown = require('ssb-markdown');

const async = require('async');

const sanitize = require('sanitize-html');

// get author info for an author ID
// based on entries about themself
exports.getAuthorData = function(sbot,authorId,done){

  var _author = {id:authorId};

  // about should have a value.content and one or more of...
  // about.value.content.[name or image or description]
  function reducer(author,about){

    if (about && about.value && about.value.content){
      if(about.value.content.name && typeof about.value.content.name == 'string'){
        author.name = about.value.content.name;
      }
      if(about.value.content.description && typeof about.value.content.description == 'string'){
        author.description = about.value.content.description
      }
      // images sometimes are a SSB ref and sometimes are a String
      if(about.value.content.image && about.value.content.image.link && typeof about.value.content.image.link == 'string'){
        author.image = about.value.content.image.link;
      }
      if(about.value.content.image && typeof about.value.content.image == 'string'){
        author.image = about.value.content.image;
      }
    }

    //console.log(about);
    return author;

  }

  pull(
    sbot.links({
      source: authorId,
      dest: authorId,
      rel: 'about',
      values:true
    }),
    reduce(reducer,_author,function(er,author){

      if(typeof author !== 'undefined' && typeof author.description == 'string'){
        author.description = sanitize(parseMd(author.description));
      }
      return done(er,author);

    })
  );


}


function mdParseUrl(s,isImg){

  if (isImg){
    return `/blob/${encodeURIComponent(s)}`
  }
  else{
    if (s.indexOf('@') === 0){
      return '/profile/'+encodeURIComponent(s).replace('.','%2E')
    }else if (s.indexOf('#') === 0){
      return '/channel/'+encodeURIComponent(s.slice(1))
    }
    return s;
  }
}

const parseMd = function(md){
  return markDown.block(md,{toUrl:mdParseUrl});
}

function isPost(entry){
  return entry.value &&
    entry.value.content &&
    entry.value.content.type &&
    entry.value.content.type == 'post'
}

function getValue(entry){
  return entry.value;
}

function markdownPost(p){
  p.value.content.text = sanitize(parseMd(p.value.content.text));
  return p;
}


// TODO: user view should show all activity, not just posts
exports.getUserPosts = function(sbot,options,done){

  const id = options.id;
  const count = options.count;
  const start = options.start;

  const streamOpts = {
    id:id,
    live:false,
    values:true,
    reverse:true
  };

  if (start == Infinity){
    // this means just start at the top
  }else{
    streamOpts.lt=start
  }

  const stream = sbot.createUserStream(streamOpts);

  pull(
    stream,
    filter(isPost),
    take(count),
    map(markdownPost),
    map(getValue),
    collect(done)
  );

}

exports.getPosts = function(sbot,options,done){

  var count = options.count;
  const start = options.start;

  const stream = sbot.createFeedStream({
    live:false,
    lte:start,
    reverse:true
  });

  pull(
    stream,
    filter(isPost),
    take(count),
    map(markdownPost),
    map(getValue),
    collect(done)
  );

}

exports.getFriendsPosts = function(sbot,options,done){

  var count = options.count;
  const start = options.start;

  sbot.friends.hops({hops: 1}, function(er,hops){

    if (er){return done(er)}

    const friendsList = Object.keys(hops).filter(i=> hops[i] == 1);// this also returns myself (hops == 0)

    function isFriend(post){
      return friendsList.indexOf(post.value.author) > -1;
    }

    const stream = sbot.createFeedStream({
      live:false,
      lte:start,
      reverse:true
    });

    pull(
      stream,
      filter(isFriend),
      filter(isPost),
      take(count),
      map(markdownPost),
      map(getValue),
      collect(done)
    );

  });

}

exports.createPost = function(sbot,post,done){

  if (typeof post.text !== 'string' || post.text.length < 1){
    return done(new Error('Post has no text and I refuse to publish it'))
  }

  var pubObj = {
    type:'post',
    text:post.text
  };

  if (post.channel){
    pubObj.channel = post.channel;
  }

  sbot.publish(pubObj,done);

}

exports.getEntries = function(sbot,options,done){

  const count = options.count;
  const start = options.start;

  const stream = sbot.createFeedStream({
    live:false,
    lte:start,
    reverse:true
  });

  pull(
    stream,
    take(count),
    map(getValue),
    collect(done)
  );
}

exports.getBlob = function(sbot,id,done){

  var id = decodeURIComponent(id);

  sbot.blobs.want(id,function(er,alreadyHadIt){
    if(er){return done(er);}

    const stream = sbot.blobs.get(id);

    // TODO: write the buffers directly to the response stream instead of loading into memory
    pull(
      stream,
      collect(function(er,results){
        if(er){return done(er)}
        if (results.length < 1){
          return done(new Error('blob not found: '+id));
        }
        console.log('found blob: '+id)
        var res = Buffer.concat(results);
        return done(null,res);
      })
    );

  })

}

// This writes each blob to the
exports.pipeBlobToStream = function(sbot,id,res){

  var id = decodeURIComponent(id);
  var wroteStatus = false;

  sbot.blobs.want(id,function(er,alreadyHadIt){
    if(er){
      res.status(500);
      return res.send(er);
    }

    const stream = sbot.blobs.get(id);

    // write the buffers directly to the response stream instead of loading into memory
    pull(
      stream,
      drain(function gotData(blob){
        if(!wroteStatus){
          res.set({'Max-Age':'31556926'})
          res.status(200);
          wroteStatus = true;
        }
        res.write(blob);
      },function done(er){
        if(!wroteStatus && er){
          res.status(500);
          res.send(er)
          return;
        }
        // either getting blobs broke halfway or actually went fine
        return res.end();

      })
    );

  })
}
