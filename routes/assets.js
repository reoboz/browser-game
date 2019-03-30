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

/* GET users listing. */
router.get('/', function(req, res, next) {
  var userId = req.session.userid
  if(userId){
    connection.query('SELECT * from userhero where userid = ?;',[userId], function (err, resa) {
      connection.query('SELECT * from hero_data', function (err, resa2) {
        connection.query('SELECT * from usergear where userid = ?;',[userId],function(err,resa3){
          connection.query('SELECT * from geardata',function(err,resa4){
            connection.query('SELECT * from usercoin where userid = ?',[userId],function(err,resa5){
              connection.query('SELECT food, stamina, unix_timestamp(now()) - unix_timestamp(lastchecked) as lasttime from stamina where userid = ?;',[userId], function (err, resa6) {
                res.render('assets', {
                  userhero: JSON.stringify(resa),
                  herodata: JSON.stringify(resa2),
                  usergear: JSON.stringify(resa3),
                  geardata: JSON.stringify(resa4),
                  usercoin: JSON.stringify(resa5),
                  stamina:JSON.stringify(resa6)
                })
              })
            })
          })
        })
      });
    });
  }else{
    res.redirect('/login');
  }
});

router.post('/party', function(req, res){
  var userId = req.session.userid
  connection.query('update userhero set party = -1 where userid=? AND party = ?',[userId,req.body.order],function(){
    connection.query('update userhero set party = ? where userid=? AND heroname = ? AND heroid = ?;',[req.body.order,userId,req.body.name,req.body.heroid],function(){
      res.send("パーティを変更しました")
    })
  })
})

router.post('/gear', function(req, res){
  var userId = req.session.userid
  connection.query('update usergear set party = -1 where userid=? AND party = ?',[userId,req.body.order],function(){
    connection.query('update usergear set party = ? where userid=? AND gearname = ? AND gearid = ?;',[req.body.order,userId,req.body.name,req.body.gearid],function(){
      res.send("パーティを変更しました")
    })
  })
})
module.exports = router;