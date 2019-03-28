var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var moment = require('moment');
var now = moment().format('YYYY-MM-DD HH:mm:ss');

let userId = null;

//MySQLに接続
const connection = mysql.createConnection({
  host : 'localhost',
  user : 'root',
  password : 'ktkr1014',
  database: 'kingoftowers'
});

/* GET users listing. */
router.get('/', function(req, res, next) {
  let tid = req.query.tid;
  userId = req.session.userid
  connection.query('select * from map where towerid = ?',[tid], function (err,resaa){
    console.log(resaa)
  });
  if (userId){
    Promise.all([monster(tid),partyinfo(userId)])
    .then(battleresult).then(function(value){
    //res.send((battlelog));

    res.render('users', {
      title: 'IN THE DUNGEON',
      data: JSON.stringify(battlelog),
      plahp: player.mhp,
      plapic: player.img,
      mobpic: "https://cdn.discordapp.com/attachments/402211254627991552/549859400701968390/enemy.png",
      mobhp: monsterhp
    });
    battlelog = [];
    });
  }else{
    res.redirect('/login');
  }
});

let battlelog = [];
function addMessage(message){
  battlelog.push(message);
}

function battleresult(){
  addMessage("攻略開始")
  let result = 0;
  return new Promise(function(resolve){
      for (let i = 1; i < mob.f+1; i++){
          addMessage("現在"+i+"階")
          if (battle(player,mob)==-1 ){
            result = -1;
            break;
          } 
      }
      if (result != -1){
        addMessage("ダンジョンクリア！")
        addMessage("ヒーローがレベルアップ！")
        console.log(player.heroid)
        connection.query("UPDATE userhero SET lv = ? where heroname = ? AND heroid = ?", [lvl+1,player.heroname,player.heroid] );

    }else{addMessage("攻略失敗･･･")}
      resolve(battlelog)
  });
}

function battle(partyinfo,monster,floor){
  let cnt = 0;
  let playerhp =partyinfo.hp
  monsterhp =monster.hp
  while(partyinfo.hp >= 0 && monster.hp >= 0) {
      cnt++
      addMessage('- Turn '+cnt+' -')
      let order = [partyinfo,monster]
      order.sort((function(a, b) {                                //AGI順に並べ替え
          const genreA = a.agi
          const genreB = b.agi
        
          let comparison = 0;
          if (genreA < genreB) {
            comparison = 1;
          } else if (genreA > genreB) {
            comparison = -1;
          }
          return comparison;
        }))
      for (i=0,len = order.length;i<len;i++){
          if (order[i].hp <= 0){break;}
          attack(order[i], (attacker => {
              if(attacker.monster){
                  return partyinfo;
              }else{
                  return monster;
              }
          })(order[i]));
      } 
  }
  if (player.hp <= 0){
      addMessage('戦闘に敗北した･･･。')
      return -1;
  }
  if (monster.hp <= 0){
      addMessage('HP'+player.hp+'を残して戦闘に勝利した！')
      //reward
      reward(userId);
      monster.hp = monsterhp
      return 1;
  }
}
function reward(userid){

  let rnum =Math.ceil(Math.random()*10000);
  if (rnum <= 1000){ addMessage("･･･おや？倒したFlenoirが何か持っていたようだ。"); }
  if (rnum <= 50){addMessage("ゆうしゃのけんを手に入れた！");connection.query("insert into usergear(userid,gearname,party,obtainedat) values(?, 'ゆうしゃのけん',-1,?)",[userid,now]);}
  if (rnum >= 51 && rnum <= 200){addMessage("ゆうしゃのたてを手に入れた！");connection.query("insert into usergear(userid,gearname,party,obtainedat) values(?, 'ゆうしゃのたて',-1,?)",[userid,now]);}
  if (rnum >= 201 && rnum <= 1000){addMessage("ぼうけんしゃのけんを手に入れた！");connection.query("insert into usergear(userid,gearname,party,obtainedat) values(?, 'ぼうけんしゃのけん',-1,?)",[userid,now]);}

}


function attack(attacker,target){
  let atk,damage;
  addMessage(attacker.heroname + 'のこうげき！')
  let rnd = Math.floor((Math.random()*101));
  if (rnd >= 100 /*- attacker.crt*/){
      atk = Math.round(attacker.atk*1.3);
      addMessage('かいしんのいちげき！')
  }else{
      atk= Math.round(attacker.atk*(0.85+0.003*rnd))
  }
  damage = atk-target.def
  if (damage<=0) {damage = Math.floor(Math.random()*6)}
  target.hp = target.hp - damage
  addMessage(target.heroname + 'に'+ damage + 'ダメージをあたえた！')
  if (target.hp <= 0){
      addMessage(target.heroname + 'はたおれた！')
  }
}

function partyinfo(userid){
  return new Promise(function(resolve){
      connection.query('select * from userhero where userid = ? AND party = 1', [userid], function (err,res){
          connection.query('select * from hero_data where heroname = ?', [res[0].heroname], function (err,res2){
            connection.query('select * from usergear where userid = ? AND party = 1', [userid], function (err,res3){
              console.log(err)
              if (res3[0] != undefined){
              //装備があった場合
              console.log("装備があった"+res3)
              connection.query('select * from geardata where gearname = ?', [res3[0].gearname], function (err,res4){
                lvl = res[0].lv
                player = {
                  heroname:res[0].heroname,
                  heroid:res[0].heroid,
                  hp:Math.round(res2[0].hp*(1+res[0].lv*0.05))+res4[0].hp,
                  mhp: Math.round(res2[0].hp*(1+res[0].lv*0.05))+res4[0].hp,
                  atk: Math.round(res2[0].atk*(1+res[0].lv*0.05))+res4[0].atk,
                  def:  Math.round(res2[0].def*(1+res[0].lv*0.05))+res4[0].def,
                  agi: Math.round(res2[0].spd*(1+res[0].lv*0.05))+res4[0].spd
                }
                resolve (player);
              });
              }else{
                //装備がなかった場合
                lvl = res[0].lv
                player = {
                  heroname:res[0].heroname,
                  heroid:res[0].heroid,
                  hp:Math.round(res2[0].hp*(1+res[0].lv*0.05)),
                  mhp: Math.round(res2[0].hp*(1+res[0].lv*0.05)),
                  atk: Math.round(res2[0].atk*(1+res[0].lv*0.05)),
                  def:  Math.round(res2[0].def*(1+res[0].lv*0.05)),
                  agi: Math.round(res2[0].spd*(1+res[0].lv*0.05)),
                  img: res2[0].img
                }
                resolve (player);
              }
            })
          })
      });
  })
}

function monster(id) {
  return new Promise(function(resolve){
      let enemylevel =0;
      let floor =0;
      connection.query('select * from map where towerid = ?',[id], function (err,res){
          switch (res[0].rarity){
              case 'Legendary':   
                  enemylevel = 80;
                  floor = 8
                  break;
              case 'Epic':
                  enemylevel = 65;
                  floor = 7;
                  break;
              case 'Rare':
                  enemylevel = 50;
                  floor = 6
                  break;
              case 'Uncommon':
                  enemylevel = 35;
                  floor = 5;
                  break;
              case 'Common':
                  enemylevel = 20;
                  floor = 4
                  break;    
          }
          //ここにRewards, Property, Added Propertyのコードを書く予定
          mob = {
              heroname:'Flenoir',
              rarity:'Common',
              monster:true,
              f:floor,
              hp:Math.round((enemylevel * 2 * (0.85+Math.random()*0.3) * (1+(floor*0.05)))),
              atk:Math.round(enemylevel * (1+(floor*0.05))),
              def: Math.round(enemylevel / 2 * (1+(floor*0.05))),
              agi: Math.round(enemylevel * (0.85+Math.random()*0.) * (1+(floor*0.05)))
          }
          resolve(mob)
      });
      })
}
module.exports = router;
