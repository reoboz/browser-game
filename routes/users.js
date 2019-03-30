var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var moment = require('moment');
var now = moment().format('YYYY-MM-DD HH:mm:ss');


let userId = null;

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
  let tid = req.query.tid;
  userId = req.session.userid
  if (userId){
    Promise.all([party(1),party(2),party(3),monster(tid,1),monster(tid,2),monster(tid,3)])
    .then(battleresult).then(function(units){
    res.render('users', {
      data: JSON.stringify(battlelog),
      player1: JSON.stringify(units[0]),
      player2: JSON.stringify(units[1]),
      player3: JSON.stringify(units[2]),
      monster1: JSON.stringify(units[3]),
      monster2: JSON.stringify(units[4]),
      monster3: JSON.stringify(units[5])
    });
    battlelog = [];
    });
  }else{
    res.redirect('/login');
  }
})


function battleresult(units){
  addMessage("攻略開始")
  let result = 0;
  return new Promise(function(resolve){
      for (let i = 1; i < units[3].floor+1; i++){
          addMessage("現在"+i+"階")
          mobdata(units,i)
          if (battle(units)==-1 ){
            result = -1;
            break;
          } 
      }
      if (result != -1){
        addMessage("ダンジョンクリア！")
        var gainedexp = 40+Math.round((50 * (1.01**units[3].mlvl) + (15*units[3].mlvl))/2)
        

    }else{addMessage("攻略失敗･･･");var gainedexp = 0}
    checklevelup(units,gainedexp)
    resolve(units)
  });
}

function battle(units,floor){
  let turncount = 0;
  let prop1 = units[3].prop
  let prop2 = units[3].addedprop
  units[0].sp = 50
  units[1].sp = 50
  units[2].sp = 50
  units[3].hp = units[3].mhp
  units[4].hp = units[4].mhp
  units[5].hp = units[5].mhp
  if(units[3].prop == 'Elite'||units[3].addedprop == 'Elite'){units[3].dead = true}else{units[3].dead = false}
  units[4].dead = false
  if(units[5].prop == 'Elite'||units[5].addedprop == 'Elite'){units[5].dead = true}else{units[5].dead = false}
  /*let playerhp =partyinfo.hp*/
  while((units[0].hp > 0 || units[1].hp > 0 || units[2].hp > 0) && (units[3].hp > 0 || units[4].hp > 0 || units[5].hp > 0)){
    turncount++
    //初回以降ターン終了時効果反映
    if(turncount > 1){
      //Poison
      if(prop1 == 'Poison'||prop2 == 'Poison' ){
        let poisondmg = Math.round(units[3].mlvl*0.15);
        addMessage("毒霧が周囲に漂っている！")
        addMessage(units[0].heroname+","+units[1].heroname+","+units[2].heroname+"は"+poisondmg+"のダメージをうけた！")
        units[0].hp -= poisondmg
        units[1].hp -= poisondmg
        units[2].hp -= poisondmg
        if (units[0].hp <= 0 && units[0].dead == false){
          addMessage(units[0].heroname + 'はたおれた！')
          units[0].dead = true
        }
        if (units[1].hp <= 0 && units[1].dead == false){
          addMessage(units[1].heroname + 'はたおれた！')
          units[1].dead = true
        }
        if (units[2].hp <= 0 && units[2].dead == false){
          addMessage(units[2].heroname + 'はたおれた！')
          units[2].dead = true
        }
      }
      //Heal
      if(prop1 == 'Heal'||prop2 == 'Heal'){
        let healamount = Math.round(units[3].mlvl*0.5)
        addMessage("怪しげな光が敵を包む！")
        if(units[3].dead == false){
          let damagedamount = units[3].mhp - units[3].hp
          if(damagedamount < healamount){units[3].hp = units[3].mhp;addMessage(units[3].heroname+"のHPが"+damagedamount+"回復した！")}
          else{units[3].hp += healamount;addMessage(units[3].heroname+"のHPが"+healamount+"回復した！")}
        }
        if(units[4].dead == false){
          let damagedamount = units[4].mhp - units[4].hp
          if(damagedamount < healamount){units[4].hp = units[4].mhp;addMessage(units[4].heroname+"のHPが"+damagedamount+"回復した！")}
          else{units[4].hp += healamount;addMessage(units[4].heroname+"のHPが"+healamount+"回復した！")}
        }
        if(units[5].dead == false){
          let damagedamount = units[5].mhp - units[5].hp
          if(damagedamount < healamount){units[5].hp = units[5].mhp;addMessage(units[5].heroname+"のHPが"+damagedamount+"回復した！")}
          else{units[5].hp += healamount;addMessage(units[5].heroname+"のHPが"+healamount+"回復した！")}
        }
      }
      //Stun復帰
      units[0].stunned = false
      units[1].stunned = false
      units[2].stunned = false
      units[3].stunned = false
      units[4].stunned = false
      units[5].stunned = false
    }
    //ターン開始
    addMessage('- Turn '+turncount+' -')
    checkability('battleStart',units)
    let order = [units[0],units[1],units[2],units[3],units[4],units[5]]
    //SPD順に並べ替え
    order.sort((function(a, b) {
        const genreA = a.spd
        const genreB = b.spd
      
        let comparison = 0;
        if (genreA < genreB) {
          comparison = 1;
        } else if (genreA > genreB) {
          comparison = -1;
        }
        return comparison;
    }))
    //SPDの速い順に行動、HPが0以下ならスキップ
    for (i=0,len = order.length;i<len;i++){
      if (order[i].dead == true){continue;}
      if (order[i].stunned == true){continue;}
      //----攻撃時発動効果があればここ
      //攻撃、モンスター属性がtrueならパーティを攻撃、falseならモンスターを攻撃
      attack(units,prop1,prop2,order[i], (attacker => {
          if(attacker.monster){
            let whotoattack = Math.ceil(Math.random()*100);
            if (whotoattack <= 70){if (units[0].dead == false){return units[0]}else if(units[1].dead == false){return units[1]}else if(units[2].dead == false){return units[2]}else{return 'none'}}
            else if(whotoattack >= 71 && whotoattack <= 90){if (units[1].dead == false){return units[1]}else if(units[2].dead == false){return units[2]}else if(units[0].dead == false){return units[0]}else{return 'none'}}
            else if(whotoattack >= 91){if (units[2].dead == false){return units[2]}else if(units[1].dead == false){return units[1]}else if(units[0].dead == false){return units[0]}else{return 'none'}} 
          }else{
            if (units[3].dead == false){return units[3]}
            else if(units[4].dead == false){return units[4]}
            else if(units[5].dead == false){return units[5]}
            else{return 'none';}
          }
      })(order[i]));
    } 
  }
  //勝利・敗北判定
  if (units[0].hp <= 0 && units[1].hp <= 0 && units[2].hp <= 0){
    addMessage('戦闘に敗北した･･･。')
    return -1;
  }
  if (units[3].hp <= 0 && units[4].hp <= 0 && units[5].hp <= 0){
    checkability('battleEnd',units)
    addMessage('戦闘に勝利した！')
    reward(units[3]);
    return 1;
  }
}

//attackはバランス調整後いじる

function attack(units,prop1,prop2,attacker,target){
  if(target != 'none'){
    let atk
    let damage
    let hitchance = Math.ceil((Math.random()*100));
    let stunchance = Math.ceil((Math.random()*100));
    let rnd = Math.ceil((Math.random()*100));
    addMessage(attacker.heroname + 'のこうげき！')
    if(attacker.ability('active',units,target) == false){
      if ((prop1 == 'Fog'||prop2 == 'Fog') && target.monster){hitchance -=15}
      if ((prop1 == 'Stun'||prop2 == 'Stun') && attacker.monster){stunchance -=35}
      
      if (hitchance >= 1){
        if (rnd >= 100 /*- attacker.crt*/){
            atk = Math.round(attacker.atk*1.15);
            addMessage('かいしんのいちげき！')
        }else{
            atk= Math.round(attacker.atk*(0.85+0.0015*rnd))
        }
        //ダメージ計算 ATKの半分までは減算、以降は除算
        damage = Math.round(atk*atk/(atk+target.def))
        //ダメージ反映
        target.hp = target.hp - damage
        addMessage(target.heroname + 'に' + damage + 'ダメージをあたえた！')
        if (stunchance < 1){target.stunned = true;addMessage(target.heroname+"はきぜつした！")}
      }else{
        addMessage(target.heroname + "はサッとかわした！")
      }
      if (target.hp <= 0){
          addMessage(target.heroname + 'はたおれた！')
          target.dead = true
      }
    }
    attacker.ability('afteractive',units,target)
  }
}
//以下いじらなくてオッケーのはず

function party(num){
  return new Promise(function(resolve){
    let player = []
    connection.query('select * from userhero where userid = ? AND party = ?', [userId,num], function (err,res){
      connection.query('select * from hero_data where heroname = ?', [res[0].heroname], function (err,res2){
        connection.query('select * from usergear where userid = ? AND party = ?', [userId,num], function (err,res3){
          if (res3[0]){
            connection.query('select * from geardata where gearname = ?', [res3[0].gearname], function (err,res4){
              player[num] = {
                heroname:res[0].heroname,
                heroid:res[0].heroid,
                lv: res[0].lv,
                exp: res[0].exp,
                sp: res2[0].stamina,
                mhp: Math.round(res2[0].hp*(1+res[0].lv*0.05))+Math.round(res4[0].hp*(1+res3[0].lv*0.025)),
                hp:Math.round(res2[0].hp*(1+res[0].lv*0.05))+Math.round(res4[0].hp*(1+res3[0].lv*0.025)),
                atk: Math.round(res2[0].atk*(1+res[0].lv*0.05))+Math.round(res4[0].atk*(1+res3[0].lv*0.025)),
                mag: Math.round(res2[0].mag*(1+res[0].lv*0.05))+Math.round(res4[0].mag*(1+res3[0].lv*0.025)),
                def:  Math.round(res2[0].def*(1+res[0].lv*0.05))+Math.round(res4[0].def*(1+res3[0].lv*0.025)),
                mdef: Math.round(res2[0].mdef*(1+res[0].lv*0.05))+Math.round(res4[0].mdef*(1+res3[0].lv*0.025)),
                spd: Math.round(res2[0].spd*(1+res[0].lv*0.05))+Math.round(res4[0].spd*(1+res3[0].lv*0.025)),
                img: res2[0].img,
                dead:false
              }
              setability(player[num])
              if (num == 1){player[num].heroname = player[num].heroname+' A'}
              if (num == 2){player[num].heroname = player[num].heroname+' B'}
              if (num == 3){player[num].heroname = player[num].heroname+' C'}
              resolve(player[num])
            })
          }else{
            player[num] = {
              heroname:res[0].heroname,
              heroid:res[0].heroid,
              lv: res[0].lv,
              exp: res[0].exp,
              sp: res2[0].stamina,
              mhp: Math.round(res2[0].hp*(1+res[0].lv*0.05)),
              hp:Math.round(res2[0].hp*(1+res[0].lv*0.05)),
              atk: Math.round(res2[0].atk*(1+res[0].lv*0.05)),
              mag: Math.round(res2[0].mag*(1+res[0].lv*0.05)),
              def:  Math.round(res2[0].def*(1+res[0].lv*0.05)),
              mdef: Math.round(res2[0].mdef*(1+res[0].lv*0.05)),
              spd: Math.round(res2[0].spd*(1+res[0].lv*0.05)),
              img: res2[0].img,
              dead:false
            }
            setability(player[num])
            if (num == 1){player[num].heroname = player[num].heroname+' A'}
            if (num == 2){player[num].heroname = player[num].heroname+' B'}
            if (num == 3){player[num].heroname = player[num].heroname+' C'}
            resolve (player[num]);
          }
        })
      })
    })
  })
}

function monster(tid,num){
  return new Promise(function(resolve){
    let monster = []
    let mlevel = 0
    let floor = 0
    connection.query('select * from map where towerid = ?',[tid], function(err,res){
      mlevel = res[0].lv
      switch (res[0].rarity){
        case 'Legendary':   
            floor = 8
            break;
        case 'Epic':
            floor = 7;
            break;
        case 'Rare':
            floor = 6
            break;
        case 'Uncommon':
            floor = 5;
            break;
        case 'Common':
            floor = 4
            break;    
        case 'Newbie':
            floor = 3
            break;    
      }
      monster[num] = {
        heroname:undefined,
        monster:true,
        floor:floor,
        rarity:res[0].rarity,
        prop:res[0].prop,
        addedprop:res[0].addedprop,
        droptype:res[0].owner,
        mlvl: mlevel,
        mhp: 10+Math.round(mlevel * 2.5),
        atk: 10+Math.round(mlevel*1.05),
        mag: 5+mlevel,
        def:  10+Math.round(mlevel*1.8),
        mdef: 0+Math.round(mlevel*1.2),
        spd: Math.round(mlevel * 1.5 * (0.9+Math.random()*0.2)),
        img:['https://cdn.discordapp.com/attachments/402211254627991552/555791687692189708/lwBhN6B0OurA0LvQOj1PwHGsjpQKQhW6gAAAABJRU5ErkJggg.png'],
        ability:function(){
          return false
        }
         //今後は色々MySQLのmobdataからとってくる.img
      }

      //入場時プロパティの反映
      if(res[0].prop == 'HP+' || res[0].addedprop == 'HP+'){Math.round(monster[num].mhp *= 1.5)}
      if(res[0].prop == 'ATK+' || res[0].addedprop == 'ATK+'){Math.round(monster[num].atk *= 1.5)}
      if(res[0].prop == 'MAG+' || res[0].addedprop == 'MAG+'){Math.round(monster[num].mag *= 1.5)}
      if(res[0].prop == 'DEF+' || res[0].addedprop == 'DEF+'){Math.round(monster[num].def *= 1.5)}
      if(res[0].prop == 'MDEF+' || res[0].addedprop == 'MDEF+'){Math.round(monster[num].mdef *= 1.5)}
      if(res[0].prop == 'SPD+' || res[0].addedprop == 'SPD+'){Math.round(monster[num].spd *= 1.3)}
      if(res[0].prop == 'Elite'|| res[0].addedprop =='Elite'){
        if(num == 2){
          Math.round(monster[num].mhp *= 3)
          Math.round(monster[num].atk *= 1.5)
          Math.round(monster[num].mag *= 1.5)
          Math.round(monster[num].def *= 1.5)
          Math.round(monster[num].mdef *= 1.5)
          Math.round(monster[num].spd *= 1.3)
        }else{
          monster[num].mhp = 0
        }
      }

      if (num == 1){monster[num].heroname = 'Flenoir A'}
      if (num == 2){monster[num].heroname = 'Flenoir B'}
      if (num == 3){monster[num].heroname = 'Flenoir C'}
      resolve(monster[num])
    })
  })
}

//mobdata 全く出来てない
function mobdata(units,floor){
  switch (units[3].rarity){
    case 'Legendary':
    if (floor == 1){}
    if (floor == 2){}
    if (floor == 3){}
    if (floor == 4){}
    if (floor == 5){}
    if (floor == 6){}
    if (floor == 7){}
    if (floor == 8){}
    break;
    case 'Epic':
    if (floor == 1){}
    if (floor == 2){}
    if (floor == 3){}
    if (floor == 4){}
    if (floor == 5){}
    if (floor == 6){}
    if (floor == 7){}
    break;
    case 'Rare':
    if (floor == 1){}
    if (floor == 2){}
    if (floor == 3){}
    if (floor == 4){}
    if (floor == 5){}
    if (floor == 6){}
    break;
    case 'Uncommon':
    if (floor == 1){}
    if (floor == 2){}
    if (floor == 3){}
    if (floor == 4){}
    if (floor == 5){}
    break;
    case 'Common':
    if (floor == 1){}
    if (floor == 2){}
    if (floor == 3){}
    if (floor == 4){}
    break;
    case 'Newbie':
    if (floor == 1){}
    if (floor == 2){}
    if (floor == 3){}
    break;
  }
}

function setability(unit){
  if(unit.heroname == 'ナギ'){
    unit.ability = function(phase){
      if (phase == 'battleEnd'){
        if(unit.sp >= 25 && unit.dead == false){
          addMessage("ナギのアビリティ発動！")
          unit.sp -= 25
          let healamount = Math.round(unit.mhp*0.2)
          if(unit.hp+healamount>unit.mhp){healamount = unit.mhp - unit.hp}
          unit.hp += healamount
          addMessage(unit.heroname+"のHPが"+healamount+"回復した！")
        }
      }else{
        return false
      }
    }
  }else if(unit.heroname == 'ミナト'){
    unit.ability = function(phase,units){
      if (phase == 'battleStart'){
        if(unit.sp >= 25 && unit.dead == false){
          addMessage("ミナトのアビリティ発動！")
          unit.sp -= 25
          for(let i=0;i<3;i++){
            let bonusamount = Math.round(units[i].spd * 0.08)
            units[i].spd = units[i].spd + bonusamount
            addMessage(units[i].heroname+"のSPDが"+bonusamount+"増加した！")
          }
        }
      }else{
        return false
      }
    }
  }else if(unit.heroname == 'エレノア'){
    unit.ability = function(phase,units){
      if (phase == 'active'){
        let count = 0
        if (units[3].dead == false){count++}
        if (units[4].dead == false){count++}
        if (units[5].dead == false){count++}
        if(unit.sp >= 20 && count >= 2 && unit.dead == false){
          addMessage("エレノアのアビリティ発動！")
          unit.sp -= 20
          for (let i=3;i<6;i++){
            if (units[i].dead == false){
              let atk
              let damage
              let rnd = Math.ceil(Math.random()*100)
              if (rnd >= 100){
                atk = Math.round(unit.mag*0.6*1.15);
                addMessage('かいしんのいちげき！')
              }else{
                atk= Math.round(unit.mag*0.6*(0.85+0.0015*rnd))
              }
            //ダメージ計算 ATKの半分までは減算、以降は除算
              damage = Math.round(atk*atk/(atk+units[i].mdef))
              //ダメージ反映
              units[i].hp = units[i].hp - damage
              addMessage(units[i].heroname + 'に' + damage + 'ダメージをあたえた！')
              if (units[i].hp <= 0){
                addMessage(units[i].heroname + 'はたおれた！')
                units[i].dead = true
            }
            }
          }
          return true
        }else{
          return false
        }
      }else{
        return false
      }
    }
  }else if(unit.heroname == 'ナタリー'){
    unit.ability = function(phase,units){
      if (phase == 'battleEnd'){
        if(unit.sp >= 30 && unit.dead == false){
          addMessage("ナタリーのアビリティ発動！")
          unit.sp -= 30
          for (let i=0;i<3;i++){
            if (units[i].dead == false){
              let rnd = Math.ceil(Math.random()*100)
              let healamount = Math.round(unit.mag*0.5*(0.85+0.0015*rnd))
              if(units[i].hp+healamount>units[i].mhp){healamount = units[i].mhp - units[i].hp}
              units[i].hp += healamount
              addMessage(units[i].heroname+"のHPが"+healamount+"回復した！")
            }
          }
          return true
        }else{
          return false
        }
      }else{
        return false
      }
    }
  }else if(unit.heroname == 'レッドナイト'){
    unit.ability = function(phase,units,target){
      if (phase == 'active'){
        if(unit.sp >= 10 && unit.dead == false){
          let atk
          let damage
          let rnd = Math.ceil((Math.random()*100));
          addMessage("レッドナイトのアビリティ発動！")
          unit.sp -= 10
          if (rnd >= 100){
            atk = Math.round(unit.atk*1.15*1.2);
            addMessage('かいしんのいちげき！')
          }else{
              atk= Math.round(unit.atk*(0.85+0.0015*rnd)*1.2)
          }
          //ダメージ計算 ATKの半分までは減算、以降は除算
          damage = Math.round(atk*atk/(atk+target.def))
          //ダメージ反映
          target.hp = target.hp - damage
          addMessage(target.heroname + 'に' + damage + 'ダメージをあたえた！')
          if (target.hp <= 0){
            addMessage(target.heroname + 'はたおれた！')
            target.dead = true
          }
          return true
        }else{
          return false
        }
      }else{
        return false
      }
    }
  }else if(unit.heroname == 'ブルーナイト'){
    unit.ability = function(phase,units,target){
      if (phase == 'afteractive'){
        if(unit.sp >= 10 && unit.dead == false){
          addMessage("ブルーナイトのアビリティ発動！")
          unit.sp -= 10
          let healamount = Math.round(unit.mag*0.5)
          if(unit.hp+healamount>unit.mhp){healamount = unit.mhp - unit.hp}
          unit.hp += healamount
          addMessage(unit.heroname+"のHPが"+healamount+"回復した！")
          return true
        }else{
          return false
        }
      }else{
        return false
      }
    }
  }else if(unit.heroname == 'ペンタイコウ'){
    unit.ability = function(phase,units,target){
      if (phase == 'afteractive'){
        if(unit.sp >= 10 && unit.dead == false){
          let stunchance = Math.ceil((Math.random()*100));
          addMessage("ブルーナイトのアビリティ発動！")
          unit.sp -= 10
          stunchance -= unit.mag
          if (stunchance < 1){target.stunned = true;addMessage(target.heroname+"はきぜつした！")}
          return true
        }else{
          return false
        }
      }else{
        return false
      }
    }
  }else{
    unit.ability = function(phase){
      return false
    }
  }
}

function checkability(phase,units){
  units[0].ability(phase,units)
  units[1].ability(phase,units)
  units[2].ability(phase,units)
  units[3].ability(phase,units)
  units[4].ability(phase,units)
  units[5].ability(phase,units)
}

function checklevelup(units,exp){
  addMessage("それぞれ "+exp+"の経験値を獲得:")
  for(let i = 0; i < 3; i++){
    if(units[i].hp > 0){
      let currentlv = units[i].lv
      let currentxp = exp+units[i].exp
      let requiredxp = Math.round(((100 * (1.08**currentlv)) + (20*currentlv))/2)
      while (currentxp >= requiredxp){
        currentxp -= requiredxp
        currentlv++
        requiredxp = Math.round(((100 * (1.08**currentlv)) + (20*currentlv))/2)
      }
      addMessage("Lv."+units[i].lv+" → Lv."+currentlv+"　次のレベルまで"+(requiredxp-currentxp))
      connection.query("update userhero set lv = ?, exp = ? where userid = ? AND party = ?;",[currentlv,currentxp,userId,i+1])
    }else{addMessage("やられてしまった…");continue}
  }
}

function reward(data){
  let drop
  let droptype =data.droptype
  let rarity = data.rarity
  let mlv = data.mlvl
  switch (rarity){
    case 'Legendary':
    if (droprate(0.3)){drop = setboxrate(10,20,35,35)}
    break
    case 'Epic':
    if (droprate(0.4)){drop = setboxrate(20,15,15,50)}
    break
    case 'Rare':
    if (droprate(0.5)){drop = setboxrate(15,15,25,15,15,15)}
    break
    case 'Uncommon':
    if (droprate(1)){drop = setboxrate(40,20,20,20)}
    break
    case 'Common':
    if (droprate(20)){drop = setboxrate(1,5,94)}
    break
  }
  if (drop >=1){
    addMessage("･･･おや？倒したモンスターが何か持っていたようだ。")
    switch (droptype){
      case 'Aliceland':
      switch (rarity){
        case 'Legendary':
        if (drop == 1){addMessage("勇者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '勇者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("熟練冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("狩人の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Epic':
        if (drop == 1){addMessage("熟練冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("狩人の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Rare':
        if (drop == 1){addMessage("狩人の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 5){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 6){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Uncommon':
        if (drop == 1){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Common':
        if (drop == 1){addMessage("2000 Aliceを手に入れた！");connection.query("update usercoin set alice = alice + 2000 where userid = ?",[userId]);}
        if (drop == 2){addMessage("500 Aliceを手に入れた！");connection.query("update usercoin set alice = alice + 500 where userid = ?",[userId]);}
        if (drop == 3){addMessage("100 Aliceを手に入れた！");connection.query("update usercoin set alice = alice + 100 where userid = ?",[userId]);}
        break
      }
      break
      case 'Brumel':
      switch (rarity){
        case 'Legendary':
        if (drop == 1){addMessage("勇者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '勇者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("熟練冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("狩人の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Epic':
        if (drop == 1){addMessage("熟練冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("狩人の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Rare':
        if (drop == 1){addMessage("狩人の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 5){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 6){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Uncommon':
        if (drop == 1){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Common':
        if (drop == 1){addMessage("2000 Bruを手に入れた！");connection.query("update usercoin set bru = bru + 2000 where userid = ?",[userId]);}
        if (drop == 2){addMessage("500 Bruを手に入れた！");connection.query("update usercoin set bru = bru + 500 where userid = ?",[userId]);}
        if (drop == 3){addMessage("100 Bruを手に入れた！");connection.query("update usercoin set bru = bru + 100 where userid = ?",[userId]);}
        break
      }
      break
      case 'Canyon':
      switch (rarity){
        case 'Legendary':
        if (drop == 1){addMessage("勇者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '勇者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("熟練冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("狩人の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Epic':
        if (drop == 1){addMessage("熟練冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("狩人の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Rare':
        if (drop == 1){addMessage("狩人の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 5){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 6){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Uncommon':
        if (drop == 1){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Common':
        if (drop == 1){addMessage("2000 Canyを手に入れた！");connection.query("update usercoin set cany = cany + 2000 where userid = ?",[userId]);}
        if (drop == 2){addMessage("500 Canyを手に入れた！");connection.query("update usercoin set cany = cany + 500 where userid = ?",[userId]);}
        if (drop == 3){addMessage("100 Canyを手に入れた！");connection.query("update usercoin set cany = cany + 100 where userid = ?",[userId]);}
        break
      }
      break
      case 'Darberg':
      switch (rarity){
        case 'Legendary':
        if (drop == 1){addMessage("勇者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '勇者の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("熟練冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("狩人の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Epic':
        if (drop == 1){addMessage("熟練冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '熟練冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("狩人の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Rare':
        if (drop == 1){addMessage("狩人の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '狩人の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 5){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 6){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Uncommon':
        if (drop == 1){addMessage("駆け出し冒険者の鎧を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の鎧',?,-1,?)",[userId,mlv,now]);}
        if (drop == 2){addMessage("駆け出し冒険者の魔導書を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の魔導書',?,-1,?)",[userId,mlv,now]);}
        if (drop == 3){addMessage("駆け出し冒険者の杖を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の杖',?,-1,?)",[userId,mlv,now]);}
        if (drop == 4){addMessage("駆け出し冒険者の剣を手に入れた！");connection.query("insert into usergear(userid,gearname,lv,party,obtainedat) values(?, '駆け出し冒険者の剣',?,-1,?)",[userId,mlv,now]);}
        break
        case 'Common':
        if (drop == 1){addMessage("2000 Darを手に入れた！");connection.query("update usercoin set dar = dar + 2000 where userid = ?",[userId]);}
        if (drop == 2){addMessage("500 Darを手に入れた！");connection.query("update usercoin set dar = dar + 500 where userid = ?",[userId]);}
        if (drop == 3){addMessage("100 Darを手に入れた！");connection.query("update usercoin set dar = dar + 100 where userid = ?",[userId]);}
        break
      }
      break
    }
  }
}

function droprate(rate){
  let num = Math.ceil(Math.random()*10000)
  if (num <= rate*100){return true}
  else{return false}
}

function setboxrate(rwd1,rwd2,rwd3,rwd4,rwd5,rwd6,rwd7,rwd8){
  let res = Math.ceil(Math.random()*100)
  rwd2 += rwd1
  rwd3 += rwd2
  rwd4 += rwd3
  rwd5 += rwd4
  rwd6 += rwd5
  rwd7 += rwd6
  if (res <= rwd1){return 1}
  if (res <= rwd2){return 2}
  if (res <= rwd3){return 3}
  if (res <= rwd4){return 4}
  if (res <= rwd5){return 5}
  if (res <= rwd6){return 6}
  if (res <= rwd7){return 7}
  else{return 8}

}

let battlelog = [];
function addMessage(message){
  battlelog.push(message);
}

module.exports = router;