const bcrypt = require('bcryptjs')
const fs = require('fs');
const path = require('path');
const SALT_SIZE = 10;
const effDicewarePassphrase = require("eff-diceware-passphrase");
const crypto = require('crypto');


const loginPath = path.join(process.cwd(),'.login');

function checkHash(password,hash,done){
  return bcrypt.compare(password,hash,done);
}

function genHash(password,callback){
  bcrypt.genSalt(SALT_SIZE, function(err, salt) {
    if (err){return callback(err)}
    bcrypt.hash(password, salt, callback);
  });
}

function loadHash(done){
  if (process.env.LOGINHASH){
    return done(null,process.env.LOGINHASH);
  }

  // else look in .secret

  // try opening.  If it doesn't exist, write a random password to it.
  fs.exists(loginPath,function(exists){
    if(exists){
      return fs.readFile(loginPath,'utf8',done)
    }
    // doesn't exist
    var defaultPass = effDicewarePassphrase(4).join(' ');
    saveNewPassword(defaultPass,function(er,hash){
      if(er){
        return done(er);
      }
      console.log("You haven't created a password yet.  Your password is now "+defaultPass+".  Please change it ASASP.")
      return done(null,hash);
    });

  })

}

function saveNewPassword(pw,callback){
  genHash(pw,function(er,hash){
    if(er){
      return callback(er);
    }else{
      fs.writeFile(loginPath,hash,function(er){
        return callback(er,hash);
      });
    }
  })
}

// get the session secret!
// It's a hash of the login hash.
// this ensures when you change the password, the old sessions are invalidated.
exports.getSessionSecret = function(done){
  loadHash(function(er,passwordBcryptHash){
    if(er){return done(er);}
    const secretHash = crypto.createHash('sha512');
    secretHash.update(passwordBcryptHash);
    return done(null,secretHash.digest('hex'));
  });
}

// get the session secret!
// It's a hash of the login hash.
// this ensures when you change the password, the old sessions are invalidated.
exports.getSessionSecretSync = function(){
  var passwordBcryptHash = '';
  try{
    passwordBcryptHash = fs.readFileSync(loginPath);
  }catch(e){
    passwordBcryptHash = effDicewarePassphrase(10);
  }
  const secretHash = crypto.createHash('sha512');
  secretHash.update(passwordBcryptHash);
  return secretHash.digest('hex');
}


// check that the password matches
// done is called with params (er,matches)
exports.authorize = function(pass,done){
  loadHash((er,hash)=>{
    if(er){return done(er);}

    // now check it
    checkHash(pass,hash,done);

  })
}

// check that an old password matches, then change it if valid
// call Done with (null,false) if it didn't match, or (null,true) if it did,
// or obviously (err) if an error occurred
exports.changePassword = function(oldPass,newPass,done){

  loadHash((er,hash)=>{
    if(er){return done(er)}

    checkHash(oldPass,hash,function(er,match){
      if(er){return done(er)}
      if(!match){
        return done(null,false)
      }else{
        // matched!  Now change it.
        saveNewPassword(newPass,function(er){
          if(er){return done(er)}
          return done(null,true);
        })

      }
    })

  })

}
