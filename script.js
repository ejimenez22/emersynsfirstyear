const openingScreen = document.getElementById("openingScreen");
const filmScreen = document.getElementById("filmScreen");
const endingScreen = document.getElementById("endingScreen");

const startButton = document.getElementById("startButton");
const replayButton = document.getElementById("replayButton");
const soundButton = document.getElementById("soundButton");

const photoElement = document.getElementById("photoElement");
const videoElement = document.getElementById("videoElement");
const backgroundMusic = document.getElementById("backgroundMusic");

const caption = document.getElementById("caption");

const chapterCard = document.getElementById("chapterCard");
const chapterLabel = document.getElementById("chapterLabel");
const chapterTitle = document.getElementById("chapterTitle");

let currentMemoryIndex = 0;
let currentTimeout = null;
let filmRunning = false;

/*
    Replace these sample file names with your actual files.

    type:
    "image"
    "video"
    "chapter"

    duration is measured in milliseconds.
*/

const memories = [
    {
        type: "chapter",
        label: "Chapter One",
        title: "The Beginning",
        duration: 3500
    },
    {
        type: "image",
        src: "images/01.jpeg",
        caption: "The day you changed our world.",
        duration: 7000
    },
    {
        type: "image",
        src: "images/02.jpeg",
        caption: "So tiny. So loved.",
        duration: 7000
    },
    {
        type: "video",
        src: "videos/01.mov",
        caption: "Your first little moments.",
        useOriginalAudio: true
    },
    {
        type: "chapter",
        label: "Chapter Two",
        title: "Learning the World",
        duration: 3500
    },
    {
        type: "image",
        src: "images/03.jpeg",
        caption: "Every day brought something new.",
        duration: 7000
    },
    {
        type: "image",
        src: "images/04.jpeg",
        caption: "One smile at a time.",
        duration: 7000
    },
    {
        type: "video",
        src: "videos/02.mov",
        caption: "That laugh changed everything.",
        useOriginalAudio: true
    },
    {
        type: "chapter",
        label: "Chapter Three",
        title: "Growing Up",
        duration: 3500
    },
    {
        type: "image",
        src: "images/05.jpeg",
        caption: "Watching you become you.",
        duration: 7000
    },
    {
        type: "image",
        src: "images/06.jpeg",
        caption: "365 days of loving you.",
        duration: 8000
    }
];

startButton.addEventListener("click", startFilm);
replayButton.addEventListener("click", restartFilm);
soundButton.addEventListener("click", toggleSound);

videoElement.addEventListener("ended", () => {
    restoreMusicAfterVideo();
    showNextMemory();
});

videoElement.addEventListener("error", () => {
    console.warn("The video could not be loaded:", videoElement.src);
    restoreMusicAfterVideo();
    showNextMemory();
});

function startFilm() {
    if (filmRunning) {
        return;
    }

    filmRunning = true;
    currentMemoryIndex = 0;

    switchScreen(openingScreen, filmScreen);

    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = 0.8;

    backgroundMusic.play().catch((error) => {
        console.warn("Music could not begin:", error);
    });

    showMemory(currentMemoryIndex);
}

function restartFilm() {
    stopCurrentMedia();

    currentMemoryIndex = 0;
    filmRunning = true;

    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = 0.8;

    switchScreen(endingScreen, filmScreen);

    backgroundMusic.play().catch((error) => {
        console.warn("Music could not restart:", error);
    });

    showMemory(currentMemoryIndex);
}

function showMemory(index) {
    clearTimeout(currentTimeout);
    hideEverything();

    const memory = memories[index];

    if (!memory) {
        finishFilm();
        return;
    }

    if (memory.type === "chapter") {
        showChapter(memory);
        return;
    }

    if (memory.type === "image") {
        showImage(memory);
        return;
    }

    if (memory.type === "video") {
        showVideo(memory);
        return;
    }

    showNextMemory();
}

function showChapter(memory) {
    chapterLabel.textContent = memory.label || "";
    chapterTitle.textContent = memory.title || "";

    chapterCard.classList.add("visible");

    currentTimeout = setTimeout(() => {
        chapterCard.classList.remove("visible");

        currentTimeout = setTimeout(showNextMemory, 1000);
    }, memory.duration || 3500);
}

function showImage(memory) {
    photoElement.src = memory.src;
    photoElement.alt = memory.caption || "A memory from Emersyn's first year";

    photoElement.className = "media-element";

    const zoomClasses = ["zoom-one", "zoom-two", "zoom-three"];
    const randomZoom =
        zoomClasses[Math.floor(Math.random() * zoomClasses.length)];

    photoElement.classList.add(randomZoom);

    photoElement.onload = () => {
        photoElement.classList.add("visible");
        showCaption(memory.caption);

        currentTimeout = setTimeout(() => {
            hideCaption();
            photoElement.classList.remove("visible");

            currentTimeout = setTimeout(showNextMemory, 1500);
        }, memory.duration || 7000);
    };

    photoElement.onerror = () => {
        console.warn("The image could not be loaded:", memory.src);
        showNextMemory();
    };
}

function showVideo(memory) {
    videoElement.src = memory.src;
    videoElement.currentTime = 0;
    videoElement.muted = !memory.useOriginalAudio;

    if (memory.useOriginalAudio) {
        backgroundMusic.volume = 0.2;
    }

    videoElement.classList.add("visible");
    showCaption(memory.caption);

    videoElement.play().catch((error) => {
        console.warn("The video could not begin:", error);
        restoreMusicAfterVideo();
        showNextMemory();
    });
}

function showCaption(text) {
    if (!text) {
        return;
    }

    caption.textContent = text;

    requestAnimationFrame(() => {
        caption.classList.add("visible");
    });
}

function hideCaption() {
    caption.classList.remove("visible");
}

function showNextMemory() {
    stopCurrentMedia();

    currentMemoryIndex += 1;

    if (currentMemoryIndex >= memories.length) {
        finishFilm();
        return;
    }

    showMemory(currentMemoryIndex);
}

function stopCurrentMedia() {
    clearTimeout(currentTimeout);

    photoElement.className = "media-element";

    videoElement.pause();
    videoElement.removeAttribute("src");
    videoElement.load();
    videoElement.className = "media-element";

    hideCaption();
    chapterCard.classList.remove("visible");
}

function restoreMusicAfterVideo() {
    backgroundMusic.volume = 0.8;
}

function finishFilm() {
    filmRunning = false;

    stopCurrentMedia();

    fadeOutMusic();

    switchScreen(filmScreen, endingScreen);
}

function fadeOutMusic() {
    const fadeInterval = setInterval(() => {
        if (backgroundMusic.volume > 0.05) {
            backgroundMusic.volume = Math.max(
                0,
                backgroundMusic.volume - 0.05
            );
        } else {
            clearInterval(fadeInterval);
            backgroundMusic.pause();
            backgroundMusic.volume = 0.8;
        }
    }, 100);
}

function toggleSound() {
    backgroundMusic.muted = !backgroundMusic.muted;

    soundButton.textContent =
        backgroundMusic.muted ? "Sound Off" : "Sound On";
}

function hideEverything() {
    photoElement.classList.remove("visible");
    videoElement.classList.remove("visible");
    chapterCard.classList.remove("visible");
    hideCaption();
}

function switchScreen(currentScreen, nextScreen) {
    currentScreen.classList.remove("active");

    setTimeout(() => {
        currentScreen.style.display = "none";
        nextScreen.style.display = "flex";

        requestAnimationFrame(() => {
            nextScreen.classList.add("active");
        });
    }, 1000);
}