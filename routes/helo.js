var express = require('express');
var router = express.Router();
var mysql = require('mysql');

//MySQLに接続
const connection = mysql.createConnection({
  host : 'mysql8010.xserver.jp',
  user : 'dnmdata_reo',
  password : 'ktkr1014',
  database: 'dnmdata_gamedata',
  timezone: 'jst'
});
 
/* GET helo page. */
router.get('/', function(req, res, next) {
  var userId = req.session.userid
  if(userId){
  connection.query('SELECT * from map;', function (err, resa) {
    connection.query('SELECT food, stamina, unix_timestamp(now()) - unix_timestamp(lastchecked) as lasttime from stamina where userid = ?;',[userId], function (err1, resa1) {
      connection.query('select * from usercoin where userid = ?',[userId], function(reqa2,resa2){
        res.render('helo', {
          map: JSON.stringify(resa),
          stamina:JSON.stringify(resa1),
          usercoin:JSON.stringify(resa2)
        })
      })
    })
  })
  }else{
    res.redirect('/login');
  }
});
 
router.get('/check', function(req, res, next) {
  var userId = req.session.userid
  connection.query('SELECT count(*) as count from userhero where userid = ? AND (party = 1 OR party = 2 OR party = 3)',[userId],function(err,resa2){
    if(resa2[0].count == 3){
      connection.query('SELECT food, stamina, unix_timestamp(now()) - unix_timestamp(lastchecked) as lasttime from stamina where userid = ?;',[userId], function (err, resa) {
        let food = resa[0].food + resa[0].lasttime/60
        let stamina = resa[0].stamina + resa[0].lasttime/1800
        if(food >= 100 && stamina >= 1){
          if (stamina > 5){stamina = 5}
          food -= 100;
          stamina -= 1;
          connection.query('update stamina set food = ?, stamina = ? ,lastchecked = now() where userid = ?',[food,stamina,userId])
          res.send("go")
        }else{res.send("errstamina")}
      });
    }else{
      res.send("errparty")
    }
  })
});
 
module.exports = router;