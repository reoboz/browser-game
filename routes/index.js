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

/* GET home page. */
router.get('/', function(req, res, next) {
  var userId = req.session.userid
  if(userId){
    connection.query('select * from usercoin where userid = ?',[userId], function(err,resa){
      connection.query('SELECT food, stamina, unix_timestamp(now()) - unix_timestamp(lastchecked) as lasttime from stamina where userid = ?;',[userId], function (err, resa2) {
        res.render('index', {
          usercoin: JSON.stringify(resa),
          stamina:JSON.stringify(resa2),
        });
      })
    });
  }else{
    res.render('index', {
      usercoin: 'None',
      stamina: 'None'
    });
  }
});

module.exports = router;
