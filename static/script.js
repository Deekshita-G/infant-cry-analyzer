const wavesurfer = WaveSurfer.create({
container:"#waveform",
waveColor:"#90cdf4",
progressColor:"#1c3d5a",
height:80
});

let history = [];
const MAX_HISTORY = 5;

function showScreen(id){
document.querySelectorAll(".screen").forEach(s=>s.classList.add("hidden"));
document.getElementById(id).classList.remove("hidden");
}

document.getElementById("audioFile").addEventListener("change",(e)=>{
const file = e.target.files[0];
if(file){
wavesurfer.loadBlob(file);
}
});

// ANALYZE
async function analyzeCry(){

const file = document.getElementById("audioFile").files[0];

if(!file){
alert("Upload audio first");
return;
}

showScreen("loadingScreen");

const formData = new FormData();
formData.append("file",file);

const response = await fetch("/predict",{method:"POST",body:formData});
const data = await response.json();

updateUI(data);
saveHistory(data);

showScreen("resultScreen");
}

// UPDATE UI
function updateUI(data){

document.getElementById("cryType").innerText =
data.classification || data.message;

document.getElementById("confValue").innerText =
(data.confidence*100).toFixed(1)+"%";

document.getElementById("cause").innerText =
data.possible_cause || "";

let img = document.getElementById("resultImage");

if(data.classification && data.classification.includes("Asphyxia")){
    img.src = "https://drive.google.com/uc?export=view&id=119bLzdwKdmaceJlYkk6tnzIj8mBpzzAU";
}
else if(data.possible_cause === "Hungry"){
    img.src = "https://drive.google.com/uc?export=view&id=197WmmlOml83iXBys0qFruiAkFNhELu0s";
}
else if(data.possible_cause === "Sleepy"){
    img.src = "https://drive.google.com/uc?export=view&id=1EQT_bxnLh9aGM4Mm2cXtKW92ypc1YQYm";
}
else if(data.possible_cause === "Tired"){
    img.src = "https://drive.google.com/uc?export=view&id=1bvC6UsbYjt3dm-_mSp3PcpW1NzikODe6";
}
else{
    img.src = "https://drive.google.com/uc?export=view&id=1hniNIGjqSVXnZTlzqKMsSV8DmeOTxBCI";
}}
// HISTORY
function saveHistory(data){

// Add latest at top
history.unshift(data);

// Keep only last 5
if(history.length > MAX_HISTORY){
    history.pop();
}

// Clear UI
let list = document.getElementById("historyList");
list.innerHTML = "";

// Re-render history
history.forEach(item=>{
    let li = document.createElement("li");

    li.innerText = `${item.classification} - ${(item.confidence*100).toFixed(1)}%`;

    list.appendChild(li);
});
}

// RECORDING (25 sec)
let mediaRecorder;
let audioChunks=[];
let timer;

recordBtn.onclick = async ()=>{
const stream = await navigator.mediaDevices.getUserMedia({audio:true});
mediaRecorder = new MediaRecorder(stream);
mediaRecorder.start();

audioChunks=[];

timer = setTimeout(()=>{
if(mediaRecorder.state==="recording"){
mediaRecorder.stop();
}
},25000);

recordBtn.style.display="none";
stopBtn.style.display="inline-block";

mediaRecorder.ondataavailable=e=>audioChunks.push(e.data);

mediaRecorder.onstop = async ()=>{
const blob = new Blob(audioChunks,{type:"audio/webm"});
wavesurfer.loadBlob(blob);

showScreen("loadingScreen");

const formData = new FormData();
formData.append("file",blob,"rec.webm");

const res = await fetch("/predict",{method:"POST",body:formData});
const data = await res.json();

updateUI(data);
saveHistory(data);

showScreen("resultScreen");
};
};

stopBtn.onclick = ()=>{
clearTimeout(timer);
mediaRecorder.stop();
recordBtn.style.display="inline-block";
stopBtn.style.display="none";
};