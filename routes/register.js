var express = require('express');
var router = express.Router();
var moment = require('moment');
var mysql = require('mysql');

//MySQLに接続
const connection = mysql.createConnection({
  host : 'mysql8010.xserver.jp',
  user : 'dnmdata_reo',
  password : 'ktkr1014',
  database: 'dnmdata_gamedata',
  timezone: 'jst'
});

router.get('/', function(req, res, next) {
  res.render('register', {
    title: '新規会員登録'
  });
});

router.post('/', function(req, res, next) {
    var userName = req.body.user_name;
    var email = req.body.email;
    var password = req.body.password;
    var createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
    var emailExistsQuery = 'SELECT * FROM users WHERE email = "' + email + '" LIMIT 1'; // 追加
    console.log(userName)
    var registerQuery = 'INSERT INTO users (username, email, password, createdat) VALUES ("' + userName + '", ' + '"' + email + '", ' + '"' + password + '", ' + '"' + createdAt + '")'; // 変更
    var useridQuery = 'SELECT userid from users where email = "'+email+'" AND password = "'+password+'"'
    connection.query(emailExistsQuery, function(err, email) {
      var emailExists = email.length;
      if (emailExists) {
        res.render('register', {
          title: '新規会員登録',
          emailExists: '既に登録されているメールアドレスです'
        });
      } else {
        connection.query(registerQuery, function(err, rows) {
          connection.query(useridQuery, function(err,userid) {
            var setuserid =userid[0].userid
            connection.query('insert into userhero (userid, heroname, lv, exp, party, obtainedat) values (?,"Asakaze",1,0,1,now())',[setuserid])
            connection.query('insert into userhero (userid, heroname, lv, exp, party, obtainedat) values (?,"Kuro",1,0,2,now())',[setuserid])
            connection.query('insert into userhero (userid, heroname, lv, exp, party, obtainedat) values (?,"Kuro",1,0,3,now())',[setuserid])
            connection.query('insert into usercoin (userid, alice, bru, cany, dar) values(?,0,0,0,0)',[setuserid])
            connection.query('insert into stamina (userid, food, stamina, lastchecked) values(?,2000,5,now())',[setuserid])
            res.redirect('/login');
          })
        });
      }
    });
  });

module.exports = router;