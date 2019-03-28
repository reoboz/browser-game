var express = require('express');
var router = express.Router();
var mysql = require('mysql');

//MySQLに接続
const connection = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : 'ktkr1014',
    database: 'kingoftowers',
    timezone: 'jst'
  });

router.get('/', function(req, res, next) {
  if (req.session.userid) {
      console.log(req.session.userid)
    res.redirect('/');
  } else {
    res.render('login', {
      title: 'ログイン'
    });
  }
});

router.post('/', function(req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  var query = 'SELECT userid FROM users WHERE email = "' + email + '" AND password = "' + password + '" LIMIT 1';
  connection.query(query, function(err, rows) {
    var userId = rows.length? rows[0].userid: false;
    if (userId) {
      req.session.userid = userId;
      res.redirect('/');
    } else {
      res.render('login', {
        title: 'ログイン',
        noUser: 'メールアドレスとパスワードが一致するユーザーはいません'
      });
    }
  });
});

module.exports = router;