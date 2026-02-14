document.addEventListener("DOMContentLoaded",()=>{

const socket=io();
let logged=false;
let user="";
let typingTimeout=null;

const chatBox=document.getElementById("chat");
const msg=document.getElementById("msg");
const file=document.getElementById("file");
const typingDiv=document.getElementById("typing");

function addBubble(data){

 const row = document.createElement("div");
 row.className = "msg " + (data.me ? "me" : "");

 const bubble = document.createElement("div");
 bubble.className = "bubble";

 // 👇 THÊM PHẦN HIỂN THỊ TÊN (chỉ khi không phải mình)
 if(!data.me){
   const name = document.createElement("div");
   name.className = "bubble-name";
   name.innerText = data.username;
   bubble.appendChild(name);
 }

 if(data.type === "text"){
   const text = document.createElement("div");
   text.innerText = data.msg;
   bubble.appendChild(text);
 }

 if(data.type === "image"){
   const im = document.createElement("img");
   im.src = data.msg;
   bubble.appendChild(im);
 }

 row.appendChild(bubble);
 chatBox.appendChild(row);

 setTimeout(()=>{
   chatBox.scrollTop = chatBox.scrollHeight;
 },50);
}


window.login=function(){
 socket.emit("login",{
  username:userInput.value,
  password:passInput.value
 });
}

window.reg=function(){
 socket.emit("register",{
  username:userInput.value,
  password:passInput.value
 });
}

window.send=function(){

 if(!logged) return;

 if(msg.value.trim()){

  socket.emit("message",{
   msg:msg.value,
   type:"text"
  });

  msg.value="";
  socket.emit("stop_typing");
 }

}

// ---------- TYPING ----------
msg.addEventListener("input",()=>{

 if(!logged) return;

 socket.emit("typing");

 clearTimeout(typingTimeout);

 typingTimeout=setTimeout(()=>{
  socket.emit("stop_typing");
 },800);

});

// ---------- AUTO UPLOAD ----------
file.addEventListener("change",()=>{

 if(!logged) return;

 const f=file.files[0];
 if(!f) return;

 const fd=new FormData();
 fd.append("file",f);

 fetch("/upload",{method:"POST",body:fd})
 .then(r=>r.json())
 .then(d=>{
  if(d.url){
   socket.emit("message",{
    msg:d.url,
    type:"image"
   });
  }
  file.value="";
 })
 .catch(()=>{
  alert("Upload lỗi");
  file.value="";
 });

});

// ---------- SOCKET ----------
socket.on("login_ok",u=>{
 logged=true;
 user=u;
 loginBox.style.display="none";
 app.style.display="flex";
});

socket.on("chat_history", list => {

 chatBox.innerHTML = "";

 list.forEach(m => {
  addBubble({
   me: m.username === user,
   username: m.username,   // 👈 THÊM DÒNG NÀY
   msg: m.msg,
   type: m.type,
   time: m.time
  });
 });

});


socket.on("message", m => {
  addBubble({
    me: m.username === user,
    username: m.username,
    msg: m.msg,
    type: m.type,
    time: m.time
  });
});


// ---------- NHẬN TYPING ----------
socket.on("typing",username=>{
 if(username!==user){
  typingDiv.innerText=username+" đang nhập...";
 }
});

socket.on("stop_typing",username=>{
 typingDiv.innerText="";
});

// ===== CHẶN PULL TO REFRESH =====
let lastY = 0;

document.addEventListener("touchstart", function(e){
    if (e.touches.length === 1) {
        lastY = e.touches[0].clientY;
    }
}, {passive:true});

document.addEventListener("touchmove", function(e){
    const y = e.touches[0].clientY;
    const diff = y - lastY;

    if (chatBox.scrollTop === 0 && diff > 0) {
        e.preventDefault();
    }
}, {passive:false});

});



