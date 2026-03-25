document.addEventListener("DOMContentLoaded", function () {

    // ===== INIT WAVESURFER =====
    const wavesurfer = WaveSurfer.create({
        container: "#waveform",
        waveColor: "#90cdf4",
        progressColor: "#1c3d5a",
        height: 80
    });

    // ===== VARIABLES =====
    let history = [];
    const MAX_HISTORY = 5;

    const audioInput = document.getElementById("audioFile");
    const recordBtn = document.getElementById("recordBtn");
    const stopBtn = document.getElementById("stopBtn");

    let mediaRecorder;
    let audioChunks = [];
    let timer;

    // ===== SCREEN SWITCH =====
    window.showScreen = function (id) {
        document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
        document.getElementById(id).classList.remove("hidden");
    };

    // ===== FILE UPLOAD =====
    audioInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            wavesurfer.loadBlob(file);
        }
    });

    // ===== ANALYZE =====
    window.analyzeCry = async function () {

        const file = audioInput.files[0];

        if (!file) {
            alert("Upload audio first");
            return;
        }

        showScreen("loadingScreen");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/predict", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            updateUI(data);
            saveHistory(data);

            showScreen("resultScreen");

        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong!");
            showScreen("inputScreen");
        }
    };

    // ===== UPDATE UI =====
    function updateUI(data) {

        document.getElementById("cryType").innerText =
            data.classification || data.message || "No result";

        document.getElementById("confValue").innerText =
            ((data.confidence || 0) * 100).toFixed(1) + "%";

        document.getElementById("cause").innerText =
            data.possible_cause || "";

        let imageURL = "https://raw.githubusercontent.com/Deekshita-G/infant-cry-classification/main/normal.jpeg";

        let classification = (data.classification || "").toLowerCase();
        let cause = (data.possible_cause || "").toLowerCase();

        if (classification.includes("asphyxia")) {
            imageURL = "https://raw.githubusercontent.com/Deekshita-G/infant-cry-classification/main/asphyxia.jpeg";
        }
        else if (cause.includes("hungry")) {
            imageURL = "https://raw.githubusercontent.com/Deekshita-G/infant-cry-classification/main/hungry.jpeg";
        }
        else if (cause.includes("sleepy")) {
            imageURL = "https://raw.githubusercontent.com/Deekshita-G/infant-cry-classification/main/sleepy.jpeg";
        }
        else if (cause.includes("tired")) {
            imageURL = "https://raw.githubusercontent.com/Deekshita-G/infant-cry-classification/main/tired.jpeg";
        }

        let img = document.getElementById("resultImage");
        img.style.display = "block";
        img.src = imageURL;
    }

    // ===== HISTORY =====
    function saveHistory(data) {

        history.unshift(data);

        if (history.length > MAX_HISTORY) {
            history.pop();
        }

        let list = document.getElementById("historyList");
        list.innerHTML = "";

        history.forEach(item => {
            let li = document.createElement("li");

            li.innerText = `${item.classification || "Unknown"} - ${((item.confidence || 0) * 100).toFixed(1)}%`;

            list.appendChild(li);
        });
    }

    // ===== RECORDING =====
    recordBtn.onclick = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            audioChunks = [];

            timer = setTimeout(() => {
                if (mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                }
            }, 25000);

            recordBtn.style.display = "none";
            stopBtn.style.display = "inline-block";

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

            mediaRecorder.onstop = async () => {

                const blob = new Blob(audioChunks, { type: "audio/webm" });

                wavesurfer.loadBlob(blob);

                showScreen("loadingScreen");

                const formData = new FormData();
                formData.append("file", blob, "recording.webm");

                const res = await fetch("/predict", {
                    method: "POST",
                    body: formData
                });

                const data = await res.json();

                updateUI(data);
                saveHistory(data);

                showScreen("resultScreen");
            };

        } catch (err) {
            console.error("Mic error:", err);
            alert("Microphone access denied!");
        }
    };

    // ===== STOP RECORD =====
    stopBtn.onclick = () => {
        clearTimeout(timer);

        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }

        recordBtn.style.display = "inline-block";
        stopBtn.style.display = "none";
    };

});