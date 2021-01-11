function init()
{
    gamemanager.init();
}

class Element{
    constructor(ele,index){
        this.ele=ele;
        this.marked=false;
        this.val="Nil";
        this.index=index;
        this.clear();
    }
    markO(){
        this.ele.innerHTML=`
        <div class="drawo">
            <div class="oli1"></div>
            <div class="oli2"></div>
            <div class="dummy"></div>
            <div class="cir"></div>
        </div>`;
        this.marked=true;
        this.val='O';
    }
    markX(){
        this.ele.innerHTML=`
        <div class="drawx">
            <div class="xline1"><div class="xl"></div></div>
            <div class="xline2"><div class="xl"></div></div>
        </div>`;
        this.marked=true;
        this.val='X';
    }
    clear(){
        this.ele.innerHTML="";
        this.marked=false;
    }
}


var Status="out";
var ROOMNAME="";
var PLAYERNAME;
var AMIHOST=false;
var MyTURN=false;
var gamemanager={
    init(){
        this.createorjoin=document.getElementById("init");
        this.waiting=document.getElementById("waiting");
        this.vs=document.getElementById("vs");
        this.ingame=document.getElementById("ingame");
        this.p1=document.getElementById("p1");
        this.p2=document.getElementById("p2");
        this.temp=document.getElementById("temp");
        this.fscreen=document.getElementById("fscreen");
        this.msgbox=document.getElementById("msgbox");
        this.loaded();
        this.gameno=0;
        this.msgbox.innerHTML="";
        iniplayername.init();
    },
    loaded(){
        this.createorjoin.style.zIndex=10;
        this.waiting.style.zIndex=-1;
        this.vs.style.zIndex=-1;
        this.ingame.style.zIndex=-1;
        this.fscreen.style.zIndex=-1;
    },
    getroomname(btn){
        var roomname=document.getElementById("rmname").value;
        if(roomname.length<3)
        {
            btn.style.borderColor="red";
            return false;
        }
        return roomname;
    },
    async tryjoin(btn){
        var roomname=this.getroomname(btn);
        if(roomname==false)return;
        await this.checkroomexistence(roomname,true,btn);
    },
    async trycreate(btn){
        var roomname=this.getroomname(btn);
        if(roomname==false)return;
        await this.checkroomexistence(roomname,false,btn);
    },
    setplayername(){
        var playername=document.getElementById("playername").value;
        iniplayername.set(playername);
        if(playername.length<2)PLAYERNAME="Player";
    },
    async joinorcreate(roomname,join=true,btn,bool){
        ROOMNAME=roomname;
        if(join){
            if(bool){
                await firebase.database().ref("TicTacToe/"+ROOMNAME+"/ClientPlayer/").set({
                    Name:PLAYERNAME,
                    ready:false ,
                    wins:0
                });
                AMIHOST=false;
                this.initwait();
            }
            else{
                btn.style.borderColor="red";
                return;
            }
        }
        else{
            if(!bool){
                await firebase.database().ref("TicTacToe/"+ROOMNAME+"/").set({
                    RoomName:roomname,
                    status:"waiting" 
                });
                await firebase.database().ref("TicTacToe/"+ROOMNAME+"/HostPlayer/").set({
                    Name:PLAYERNAME,
                    ready:false ,
                    wins:0
                });
                AMIHOST=true;
                this.initwait();
            }
            else{
                btn.style.borderColor="red";
                return;
            }
        }
    },
    async checkroomexistence(roomname,join=true,btn){
        this.setplayername();
        btn.style.borderColor="white";
        await firebase.database().ref("TicTacToe/").once('value',(snapshot)=>{
            var bool=false;
            snapshot.forEach((childsnap) => {
                var x=childsnap.val().RoomName;
                if(roomname==x)
                {
                    console.log("iuu");
                    bool=true;
                    if(join==true && x.status=="waiting")
                    {
                        this.joinorcreate(roomname,join,btn,bool);
                        return;
                    }
                }
            });
            this.joinorcreate(roomname,join,btn,bool);
        });
    },
    async initwait(){
        document.getElementById("ready").style.opacity=0;
        this.createorjoin.style.zIndex=-1;
        this.waiting.style.zIndex=10;
        this.StartObserve();
    },
    async StartObserve(){
        firebase.database().ref("TicTacToe/"+ROOMNAME+"/").on('value',(snapshot)=>{
            Status=snapshot.val().status;
            if(Status=="ready"){
                this.initgames();
            }
            if(AMIHOST)this.dohostactivities();
            if(Status=="checkready"){
                document.getElementById("ready").style.opacity=1;
            }
        });
        firebase.database().ref("TicTacToe/"+ROOMNAME+"/Msg/").on('value',(snapshot)=>{
            var tempmsgs=[];
            if(snapshot.val()!=null){
                snapshot.forEach((childsnap) => {
                    tempmsgs.push(childsnap.val());
                });
                this.displaymsgs(tempmsgs);
            }
        })
    },
    async dohostactivities(){
            firebase.database().ref("TicTacToe/"+ROOMNAME+"/ClientPlayer").once('value',(snapshot)=>{
                if(snapshot.val()==null)return;
                if(Status=="waiting"){
                    firebase.database().ref("TicTacToe/"+ROOMNAME+"/").update({
                        status:"checkready"
                    });
                }
                if(Status=="checkready")
                {
                bool=snapshot.val().ready;
                if(bool){
                    firebase.database().ref("TicTacToe/"+ROOMNAME+"/HostPlayer").once('value',(snapshot)=>{
                        bool=snapshot.val().ready;
                        if(bool){
                            firebase.database().ref("TicTacToe/"+ROOMNAME+"/").update({
                                status:"ready"
                            });
                        }
                    });
                }
                }
            });
            if(Status=="ready"){
                firebase.database().ref("TicTacToe/"+ROOMNAME+"/").update({
                    status:"started"
                });
            }
    },
    async tryinitgames(){
        var iam='ClientPlayer';
        if(AMIHOST)iam='HostPlayer';
        firebase.database().ref("TicTacToe/"+ROOMNAME+"/"+iam).update({
            ready:true
        });
    },
    async initgames(){
        let Otherplayer;
        if(AMIHOST){
            await firebase.database().ref("TicTacToe/"+ROOMNAME+"/ClientPlayer/").once('value',(snapshot)=>{
                Otherplayer=snapshot.val().Name;
            });
            for(var i=1;i<6;i++){
                var ran=Math.floor(Math.random()*100)%2;
                await firebase.database().ref("TicTacToe/"+ROOMNAME+"/Game"+i).set({
                    status:"started",
                    lastplayer:(ran==1?"O":"X"),
                    strikedval:-1,
                    gameno:i,
                    player:"Nil"
                });
            }
        }else{
            await firebase.database().ref("TicTacToe/"+ROOMNAME+"/HostPlayer/").once('value',(snapshot)=>{
                Otherplayer=snapshot.val().Name;
            });
        }
        p1.innerHTML=PLAYERNAME;
        p2.innerHTML=Otherplayer;
        document.getElementById("p11").innerHTML=PLAYERNAME;
        document.getElementById("p22").innerHTML=Otherplayer;
        this.gameno=0;
        this.initgame();
    },
    async initgame(){
        this.gameno++;
        document.getElementById("roundup1").innerHTML="Round "+this.gameno+" ("+this.gameno+"/5)";
        document.getElementById("roundup2").innerHTML="Round "+this.gameno;
        if(this.gameno>1){
            firebase.database().ref("TicTacToe/"+ROOMNAME+"/Game"+(this.gameno-1)).off();
        }
            if(this.gameno>5){
                console.log("Error -- fscreen");
                var hostsc,clientsc;
                firebase.database().ref("TicTacToe/"+ROOMNAME+"/ClientPlayer/").once('value',(snapshot)=>{
                    clientsc=snapshot.val().wins;
                })
                firebase.database().ref("TicTacToe/"+ROOMNAME+"/HostPlayer/").once('value',(snapshot)=>{
                    hostsc=snapshot.val().wins;
                })
                var mysc=clientsc;
                var otsc=hostsc;
                if(AMIHOST)
                {
                    mysc=hostsc;
                    otsc=clientsc;
                }
                var result="Tie";
                if(mysc>otsc)result="Winner";
                if(mysc<otsc)result="You Loose";
                document.getElementById("gos").innerHTML=result;
                if(result!="Tie"){
                    document.getElementById("gos").style.color=mysc>otsc?"#0f0":"#f00";
                }
                this.fscreen.style.zIndex=12;
                return;
            }
        board.init(false);
        if(AMIHOST)board.init(true);
        firebase.database().ref("TicTacToe/"+ROOMNAME+"/Game"+this.gameno).on('value',(snapshot)=>{
            console.log("calling bar x o");
            if(snapshot.val()!=null && snapshot.val().status=="started"){
                MyTURN=false;
                board.highlight(false);
                if(board.playerisx && snapshot.val().lastplayer=="O"){
                    MyTURN=true;
                    board.highlight(true);
                }
                if(!board.playerisx && snapshot.val().lastplayer=="X"){
                    MyTURN=true;
                    board.highlight(true);
                }
                if(snapshot.val().strikedval!=-1){
                    var isx=snapshot.val().lastplayer=='X';
                    board.mark(isx,snapshot.val().strikedval);
                }
            }
        });
        this.ingame.style.zIndex=-1;
        this.waiting.style.zIndex=-1;
        this.vs.style.zIndex=10;
        p1.style.marginLeft="40%";
        p2.style.marginRight="40%";
        await timer(500);
        this.vs.style.zIndex=-1;
        this.ingame.style.zIndex=10;
        p1.style.marginLeft="0%";
        p2.style.marginRight="0%";
    },
    async managegame(){
        board.gameover=false;
        board.go=true;
        var urstatus;
        if(board.istie){
            urstatus="Tie";
            temp.style.color="#00f";
        }
        else
        {
            var player;
            await firebase.database().ref("TicTacToe/"+ROOMNAME+"/Game"+this.gameno).once('value',(snapshot)=>{
                player=snapshot.val().player;
                firebase.database().ref("TicTacToe/"+ROOMNAME+"/"+player).once('value',(snapshot)=>{
                    var dir=player;
                    player=snapshot.val().Name;
                    var wins=1+snapshot.val().wins;
                    firebase.database().ref("TicTacToe/"+ROOMNAME+"/"+dir).update({
                        wins:wins
                    })
                    console.log(player==PLAYERNAME);
                    urstatus=(player==PLAYERNAME)?"You Won":"You Loose";
                    temp.style.color=(player==PLAYERNAME)?"#0f0":"#f00";
                });
            });
        }
        temp.style.zIndex=100;
        temp.style.opacity=1;
        temp.innerHTML=urstatus;
        await timer(1500);
        temp.style.opacity=0;
        temp.style.zIndex=-100;
        temp.innerHTML="";
        this.initgame();
    },
    displaymsgs(msgs){
        var innerhtml="";
        for(let i=0;i<msgs.length;i++){
            if(msgs[i].iamhost==AMIHOST){
                innerhtml+=`<div class="msgmsg">
                    <div class="msgname me">You</div>
                    <div class="msgcontent me">${msgs[i].msg}</div>
                </div>`
            }
            else{
            innerhtml+=`<div class="msgmsg">
                <div class="msgname">${msgs[i].name}</div>
                <div class="msgcontent">${msgs[i].msg}</div>
            </div>`
            }
        }
        this.msgbox.innerHTML=innerhtml;
        this.msgbox.scrollTop=this.msgbox.scrollHeight;
    },
    async sendmsg(){
        var msg=document.getElementById("msg").value;
        if(msg=="" || msg==" ")return;
        var tdate=new Date;
        tdate = tdate.getTime();
        firebase.database().ref("TicTacToe/"+ROOMNAME+"/Msg/"+tdate).set({
            iamhost:AMIHOST,
            name:PLAYERNAME,
            msg:msg
        });
        document.getElementById("msg").value="";
    }
}
function timer(ms){
    return new Promise(res=>setTimeout(res,ms));
}
function sendmsg(){
    gamemanager.sendmsg();
}



var board={
    init(isx){
        var elements=document.getElementsByClassName("eleabs");
        var elearry=new Array(elements.length);
        for(var i=0;i<elements.length;i++)
        {
            elearry[i]=new Element(elements[i],i);
        }
        this.elements=elearry;
        this.playerisx=isx;
        this.gamearea=document.getElementsByClassName("board")[0];
        this.gameover=false;
        this.clear();
        this.highlight(false);
        this.linestrike(0);
        this.go=false;
        this.istie=false;
    },
    clear(){
        for(var i=0;i<this.elements.length;i++)
        {
            this.elements[i].clear();
        }
    },
    mark(isx,pos){
        if(this.go){
            this.highlight(false);
            return;
        }
        if(this.elements==undefined || this.elements[pos].marked)
        {
            console.log("Error");
            return;
        }
        if(isx)
        this.elements[pos].markX();
        else
        this.elements[pos].markO();
        if(this.playerisx){
            this.changetogreen();
        }
        this.check();
        if(this.gameover){
            gamemanager.managegame();
        }
    },
    check(){
        var xc=0,oc=0;
        for(var i=0;i<3;i++){
            xc=0;oc=0;
            for(var j=0;j<3;j++){
                if(this.elements[i+3*j].val=='O'){oc++;}
                if(this.elements[i+3*j].val=='X'){xc++;}
                var t=-1;
                var boo;
                if(xc==3){
                    t=1;
                    boo=this.playerisx;
                }
                if(oc==3){
                    t=1;
                    boo=!this.playerisx;
                }
                if(t==1){
                    this.linestrike(4+i,boo);
                }
            }
        }
        xc=0;oc=0;
        for(var i=0;i<9;i++){
            if(this.elements[i].val=='O'){oc++;}
            if(this.elements[i].val=='X'){xc++;}
            if(i%3==2){
                var t=-1;
                var boo;
                if(xc==3){
                    t=1;
                    boo=this.playerisx;
                }
                if(oc==3){
                    t=1;
                    boo=!this.playerisx;
                }
                if(t==1){
                    this.linestrike(4-(i+1)/3,boo);
                }
                xc=0;oc=0;
            }
        }
        xc=0;oc=0;
        for(var i=0;i<3;i++){
            if(this.elements[3*i+i].val=='O'){oc++;}
            if(this.elements[3*i+i].val=='X'){xc++;}
            if(i%3==2){
                var t=-1;
                var boo;
                if(xc==3){
                    t=1;
                    boo=this.playerisx;
                }
                if(oc==3){
                    t=1;
                    boo=!this.playerisx;
                }
                if(t==1){
                    this.linestrike(7,boo);
                }
                xc=0;oc=0;
            }
        }
        xc=0;oc=0;
        for(var i=0;i<3;i++){
            if(this.elements[3*i+2-i].val=='O'){oc++;}
            if(this.elements[3*i+2-i].val=='X'){xc++;}
            if(i%3==2){
                var t=-1;
                var boo;
                if(xc==3){
                    t=1;
                    boo=this.playerisx;
                }
                if(oc==3){
                    t=1;
                    boo=!this.playerisx;
                }
                if(t==1){
                    this.linestrike(8,boo);
                }
                xc=0;oc=0;
            }
        }
        if(this.gameover)return;
        let count=0;
        for(var i=0;i<9;i++){
            if(this.elements[i].marked==true)
            {
                count++;
            }
        }
        if(count==9)
        {
            this.istie=true;
            this.gameover=true;
        }
    },
    changetogreen(){
        var ch=document.getElementsByClassName("xl");
        for(let i=0;i<ch.length;i++){
            ch[i].style.background="#0f0";
        }
        ch=document.getElementsByClassName("oli1");
        for(let i=0;i<ch.length;i++){
            ch[i].style.background="linear-gradient(90deg,red 0%,red 50%,transparent 50%,transparent 100%)";
        }
        ch=document.getElementsByClassName("oli2");
        for(let i=0;i<ch.length;i++){
            ch[i].style.background="linear-gradient(90deg,red 0%,red 50%,transparent 50%,transparent 100%)";
        }
    },
    highlight(x){
        if(x)
        this.gamearea.style.borderColor="#0f0";
        else
        this.gamearea.style.borderColor="transparent";
    },
    linestrike(x,bool){
        var line=document.getElementById("line");
        var cut=document.getElementById("cut");
        cut.style.animation="";
        if(x==0){
            cut.style.background="transparent";return;
        }
        this.gameover=true;
        if(bool){
            cut.style.background="#0f0";
        }
        else{
            cut.style.background="#f00";
        }
        switch(x){
            case 1:line.style.transform="translateY(105px)";break;
            case 2:line.style.transform="translateY(0px)";break;
            case 3:line.style.transform="translateY(-105px)";break;
            case 4:line.style.transform="rotate(90deg) translateY(105px)";break;
            case 5:line.style.transform="rotate(90deg)";break;
            case 6:line.style.transform="rotate(90deg) translateY(-105px)";break;
            case 7:line.style.transform="rotate(45deg)";break;
            case 8:line.style.transform="rotate(135deg)";break;
        }
        //this.linestrike(0);
        cut.style.animation="anim1 1s linear forwards";
    }
};
function trymarking(x){
    //conditions
    if(board.elements[x].marked)return;
    if(!MyTURN)return;
    var iam='ClientPlayer';
    if(AMIHOST)iam='HostPlayer';
    var mark=board.playerisx?'X':'O';
    firebase.database().ref("TicTacToe/"+ROOMNAME+"/Game"+gamemanager.gameno).update({
        strikedval:x,
        lastplayer:mark,
        player:iam
    });
    MyTURN=false;
}

function NewGame(){
    firebase.database().ref("TicTacToe/"+ROOMNAME+"/").off();
    firebase.database().ref("TicTacToe/"+ROOMNAME+"/Msg/").off();
    board.clear();
    ROOMNAME="";
    AMIHOST=false;
    MyTURN=false;
    gamemanager.init();
    document.getElementById("playername").value=PLAYERNAME;
}
var iniplayername={
    init()
    {
        this.key='https://tictactoebycne.web.app-tttplayer';
        this.name=localStorage[this.key] || "player";
        this.set(this.name);
    },
    set(name)
    {
        this.name=name;
        localStorage[this.key] = name;
        document.getElementById("playername").value=this.name;
        PLAYERNAME=this.name;
    },
    get()
    {
        return this.name;
    }
}