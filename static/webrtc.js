var pc;
var currentPeer;

// ---------- FIX ANDROID 5 getUserMedia ----------
function getMedia(constraints){
 return new Promise(function(resolve,reject){

  var gum =
   navigator.mediaDevices && navigator.mediaDevices.getUserMedia
   ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
   : (navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia);

  if(!gum){
   alert("Browser không hỗ trợ getUserMedia");
   return reject();
  }

  // trình duyệt mới
  if(gum.length===1){
   gum(constraints).then(resolve).catch(reject);
  }
  // trình duyệt cũ android 5
  else{
   gum.call(navigator,constraints,resolve,reject);
  }

 });
}
// ------------------------------------------------

async function createPeer(){

 pc = new RTCPeerConnection({
  iceServers:[{urls:"stun:stun.l.google.com:19302"}]
 });

 pc.ontrack=function(e){
  document.getElementById("remoteVideo").srcObject=e.streams[0];
 };

 pc.onicecandidate=function(e){
  if(e.candidate){
   socket.emit("webrtc_ice",{
    candidate:e.candidate,
    target:currentPeer
   });
  }
 };
}

async function startCall(){

 currentPeer=document.getElementById("callUser").value;

 await createPeer();

 const stream=await getMedia({
  audio:true,
  video:false
 });

 stream.getTracks().forEach(function(t){
  pc.addTrack(t,stream);
 });

 document.getElementById("localVideo").srcObject=stream;

 socket.emit("call_user",{
  target:currentPeer,
  caller:username
 });
}

socket.on("incoming_call",async function(data){

 if(confirm("Incoming call from "+data.caller)){

  currentPeer=data.caller;

  await createPeer();

  const stream=await getMedia({
   audio:true,
   video:false
  });

  stream.getTracks().forEach(function(t){
   pc.addTrack(t,stream);
  });

  document.getElementById("localVideo").srcObject=stream;

  socket.emit("accept_call",{caller:data.caller});
 }
});

socket.on("call_accepted",async function(){

 const offer=await pc.createOffer();
 await pc.setLocalDescription(offer);

 socket.emit("webrtc_offer",{
  offer:offer,
  target:currentPeer
 });
});

socket.on("webrtc_offer",async function(data){

 await pc.setRemoteDescription(data.offer);

 const ans=await pc.createAnswer();
 await pc.setLocalDescription(ans);

 socket.emit("webrtc_answer",{
  answer:ans,
  target:currentPeer
 });
});

socket.on("webrtc_answer",async function(data){
 await pc.setRemoteDescription(data.answer);
});

socket.on("webrtc_ice",async function(data){
 if(pc) await pc.addIceCandidate(data.candidate);
});
