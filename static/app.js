document.addEventListener("DOMContentLoaded",()=>{

const socket=io();
let logged=false;
let user="";

const chatBox=document.getElementById("chat");
const msg=document.getElementById("msg");
const file=document.getElementById("file");

function addBubble(data){

 const row=document.createElement("div");
 row.className="msg "+(data.me?"me":"");

 const bubble=document.createElement("div");
 bubble.className="bubble";

 if(data.type==="text"){
  bubble.innerText=data.msg;
 }

 if(data.type==="image"){
  const im=document.createElement("img");
  im.src=data.msg;
  bubble.appendChild(im);
 }

 row.appendChild(bubble);
 chatBox.appendChild(row);

 setTimeout(()=>{
  chatBox.scrollTop=chatBox.scrollHeight;
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
 }

}

// ---------- AUTO UPLOAD NGAY KHI CHỌN ẢNH ----------
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

socket.on("chat_history",list=>{
 chatBox.innerHTML="";
 list.forEach(m=>{
  addBubble({
   me:m.username===user,
   msg:m.msg,
   type:m.type
  });
 });
});

socket.on("message",m=>{
 addBubble({
  me:m.username===user,
  msg:m.msg,
  type:m.type
 });
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
