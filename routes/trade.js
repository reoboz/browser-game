var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var moment = require('moment');
var now = moment().format('YYYY-MM-DD HH:mm:ss');

//MySQLに接続
const connection = mysql.createConnection({
  host : 'localhost',
  user : 'root',
  password : 'ktkr1014',
  database: 'kingoftowers',
  timezone: 'jst'
});

/* GET users listing. */
router.get('/', function(req, res, next) {
  var userId = req.session.userid
  if(userId){
    connection.query('select * from hero_data', function(reqa,resa){
      connection.query('select * from usercoin where userid = ?',[userId], function(reqa2,resa2){
        connection.query('select * from userhero where userid = ?',[userId], function(reqa3,resa3){
          connection.query('select * from usergear where userid = ?',[userId], function(reqa4,resa4){
            connection.query('select * from geardata', function(reqa5,resa5){
              connection.query('SELECT food, stamina, unix_timestamp(now()) - unix_timestamp(lastchecked) as lasttime from stamina where userid = ?;',[userId], function (err, resa6) {
                res.render('trade', {
                  herodata: JSON.stringify(resa),
                  usercoin: JSON.stringify(resa2),
                  userhero: JSON.stringify(resa3),
                  usergear:JSON.stringify(resa4),
                  geardata:JSON.stringify(resa5),
                  stamina:JSON.stringify(resa6),
                });
              })
            })
          });
        });
      })
    })
  }else{
    res.redirect('/login');
  }
});

router.get('/shop', function(req, res){
  connection.query('select * from shop order by start desc', function(reqa,resa){
      res.send(resa)
  })
})

router.get('/purchase', function(req, res){
  var userId = req.session.userid
  var productId = Number(req.query.productid)
  connection.query('select * from shop order by start desc limit 1 offset ?',[productId], function(reqa,resa){
    connection.query('select * from usercoin where userid = ?',[userId],function(reqa2,resa2){
      if (resa2[0].alice-resa[0].price >= 0 && resa[0].stock > 0){
        connection.query('update usercoin set alice = alice - ? where userid = ?',[resa[0].price,userId])
        connection.query('update shop set stock = stock - 1 where heroname= ?',[resa[0].heroname])
        connection.query('insert into userhero(userid,heroname,lv,party,obtainedat) values(?,?,1,0,?);',[userId,resa[0].heroname,now])
        res.send(resa[0].heroname+"を"+resa[0].price+"で購入しました")
      }else{res.send("購入に失敗しました。")}
    })
  })
})

router.get('/trade/hero', function(req, res){
  connection.query('select * from tradehero order by listedat desc', function(reqa,resa){
      res.send(resa)
  })
})

router.get('/trade/gear', function(req, res){
  connection.query('select * from tradegear order by listedat desc', function(reqa,resa){
      res.send(resa)
  })
})

router.get('/trade/purchase', function(req, res){
  var userId = req.session.userid
  var productId = Number(req.query.productid)
  if (req.query.type==='1'){
    connection.query('select * from tradehero order by listedat desc limit 1 offset ?',[productId], function(reqa,resa){
      connection.query('select * from usercoin where userid = ?',[userId],function(reqa2,resa2){
        if (resa2[0].alice-resa[0].price >= 0 && resa[0].userid != userId){
          connection.query('update usercoin set alice = alice - ? where userid = ?',[resa[0].price,userId])
          connection.query('delete from tradehero where heroname= ? AND heroid=?',[resa[0].heroname,resa[0].heroid])
          connection.query('update userhero set userid =?,obtainedat=? where userid=0 AND heroname=? AND heroid=?;',[userId,now,resa[0].heroname,resa[0].heroid])
          connection.query('update usercoin set alice = alice + ? where userid = ?',[resa[0].price,resa[0].userid])
          res.send(resa[0].heroname+"を"+resa[0].price+"で購入しました")
        }else{res.send("購入に失敗しました。")}
      })
    })
  }else if (req.query.type==='2'){
    console.log(productId)
    connection.query('select * from tradegear order by listedat desc limit 1 offset ?',[productId], function(reqa,resa){
      connection.query('select * from usercoin where userid = ?',[userId],function(reqa2,resa2){
        if (resa2[0].alice-resa[0].price >= 0 && resa[0].userid != userId){
          console.log(resa)
          connection.query('update usercoin set alice = alice - ? where userid = ?',[resa[0].price,userId])
          connection.query('delete from tradegear where gearname= ? AND gearid=?',[resa[0].gearname,resa[0].gearid])
          connection.query('update usergear set userid =?,obtainedat=? where userid=0 AND gearname =? AND gearid =?;',[userId,now,resa[0].gearname,resa[0].gearid])
          connection.query('update usercoin set alice = alice + ? where userid = ?',[resa[0].price,resa[0].userid])
          res.send(resa[0].gearname+"を"+resa[0].price+"で購入しました")
        }else{res.send("購入に失敗しました。")}
      })
    })
  }
})

router.get('/submit', function(req, res){
  var userId = req.session.userid
  var item = req.query.item
  var itemid = Number(req.query.itemid)
  var price = Number(req.query.price)
  if (req.query.type==='1'){
    connection.query("select * from userhero where userid=? order by obtainedat desc",[userId],function(reqa,resa){
      if(resa.length < 4){console.log("test");res.send("出品後にヒーローを3体以上所持している必要があります。");return;}
      connection.query("select * from userhero where userid=? AND heroid=? AND heroname=?",[userId,itemid,item], function(reqa2,resa2){
        console.log(resa2.length)
        if (resa2.length){
          connection.query('update userhero set userid=0 where userid=? AND heroid=? AND heroname=?',[userId,itemid,item])
          console.log(userId,item,itemid,resa2[0].lv,resa2[0].exp,price)
          connection.query('insert into tradehero(userid, heroname, heroid, lv, exp, price, obtainedat, listedat) values(?,?,?,?,?,?,?,?);',[userId,item,itemid,resa2[0].lv,resa2[0].exp,price,resa2[0].obtainedat,now])
          res.send("出品に成功しました")
        }else{res.send("出品しようとしたヒーローが見つかりませんでした。");return;}
      })
    })
  }else if(req.query.type==='2'){
    connection.query("select * from usergear where userid=? AND gearid=? AND gearname=?",[userId,itemid,item], function(reqa,resa){
      if (resa.length){
        connection.query('update usergear set userid=0 where userid=? AND gearid=? AND gearname=?',[userId,itemid,item])
        connection.query('insert into tradegear(userid, gearname, gearid, lv, price, obtainedat, listedat) values(?,?,?,?,?,?,?);',[userId,item,itemid,resa[0].lv,price,resa[0].obtainedat,now])
        res.send("出品に成功しました")
      }else{res.send("出品しようとしたアイテムが見つかりませんでした。");return;}
    });
  }
})

module.exports = router;
