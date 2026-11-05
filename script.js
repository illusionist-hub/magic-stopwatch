
const timeDisplay = document.getElementById("time");
const startButton = document.getElementById("start");
const lapButton = document.getElementById("lap");

const lapsDisplay = document.getElementById("laps");

let lapCount = 0;
let lastLapTime = 0;

let lapRecords = [];

let forcedTime = 13540;

let displayedTime = 0;

let forceWindowStart = 11000;
let forceWindowEnd = 16000;
let forceTargetRealTime = 14000;


let hybridForceEnabled = true;

let forceAlreadyApplied = false;

let minForceSpeed = 0.75;
let maxForceSpeed = 1.25;



let running = false;
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;

function formatTime(milliseconds) {
    const totalCentiseconds = Math.floor(milliseconds / 10);

    const minutes = Math.floor(totalCentiseconds / 6000);
    const seconds = Math.floor((totalCentiseconds % 6000) / 100);
    const centiseconds = totalCentiseconds % 100;

    return (
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0") + "," +
        String(centiseconds).padStart(2, "0")
    );
}

function parseForceTime(timeString) {

    const normalized = timeString.trim().replace(/[.٫،]/g, ",");
    const parts = (normalized.includes(":") ? normalized : "00:" + normalized).match(
        /^(\d{1,2}):(\d{2}),(\d{1,2})$/
    );

    if (!parts) {
        return null;
    }

    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    const centiseconds = Number(parts[3].padEnd(2, "0"));

    if (seconds > 59) {
        return null;
    }

    const totalMilliseconds =
        minutes * 60000 +
        seconds * 1000 +
        centiseconds * 10;

    return totalMilliseconds;
}

function distributeForcedTime(durations, targetMilliseconds) {

    const target = Math.floor(targetMilliseconds / 10);

    const total = durations.reduce(function (sum, duration) {
        return sum + duration;
    }, 0);

    if (durations.length === 0 || total <= 0) {
        return [];
    }

    const exact = durations.map(function (duration) {
        return (duration / total) * target;
    });

    const result = exact.map(function (value) {
        return Math.floor(value);
    });

    let remainder = target - result.reduce(function (sum, value) {
        return sum + value;
    }, 0);

    const order = exact.map(function (value, index) {
        return {
            index: index,
            fraction: value - Math.floor(value)
        };
    });

    order.sort(function (a, b) {
        return b.fraction - a.fraction;
    });

    for (let i = 0; i < remainder; i++) {
        result[order[i].index]++;
    }

    return result.map(function (value) {
        return value * 10;
    });
}



function applyForce() {

    const currentLap = document.getElementById("current-lap");

    const durations = lapRecords.map(function (lap) {
        return lap.duration;
    });

    if (currentLap) {
        const currentDuration = Math.max(
            0,
            elapsedTime - lastLapTime
        );

        durations.push(currentDuration);
    }

    const adjusted = distributeForcedTime(
        durations,
        forcedTime
    );

    lapRecords.forEach(function (lap, index) {

        lap.duration = adjusted[index];

        lap.element.querySelector(".lap-time").textContent =
            formatTime(lap.duration);
    });

    if (currentLap && adjusted.length > 0) {

        const finalDuration = adjusted[adjusted.length - 1];

        currentLap.querySelector(".lap-time").textContent =
            formatTime(finalDuration);
    }

    elapsedTime = forcedTime;

if (currentLap && adjusted.length > 0) {
    const finalDuration = adjusted[adjusted.length - 1];

    lastLapTime = forcedTime - finalDuration;
}

forceAlreadyApplied = true;
displayedTime = forcedTime;

    // Табло оновлює animateForcedTime після завершення форсування.

    updateLapColors();
}

let forceAnimationFrame = 0;
let forceAnimationToken = 0;

function cancelForceAnimation() {
    forceAnimationToken++;
    if (forceAnimationFrame) cancelAnimationFrame(forceAnimationFrame);
    forceAnimationFrame = 0;
    timeDisplay.getAnimations().forEach(animation => animation.cancel());
    timeDisplay.querySelectorAll(".force-old, .force-new").forEach(el => {
        el.getAnimations().forEach(animation => animation.cancel());
    });
}

function animateForcedTime(fromTime, toTime) {
    cancelForceAnimation();
    const token = forceAnimationToken;
    const oldText = formatTime(fromTime);
    const newText = formatTime(toTime);

    // Ширина не змінюється під час переходу: обидва значення накладені.
    const bounds = timeDisplay.getBoundingClientRect();
    timeDisplay.style.width = `${bounds.width}px`;
    timeDisplay.style.height = `${bounds.height}px`;
    timeDisplay.style.position = "relative";
    timeDisplay.textContent = "";

    const oldSpan = document.createElement("span");
    oldSpan.className = "force-old";
    oldSpan.textContent = oldText;
    const newSpan = document.createElement("span");
    newSpan.className = "force-new";
    newSpan.textContent = newText;
    oldSpan.style.opacity = "1";
    newSpan.style.opacity = "0";
    timeDisplay.append(oldSpan, newSpan);

    function finish() {
        if (token !== forceAnimationToken) return;
        timeDisplay.textContent = newText;
        timeDisplay.style.width = "";
        timeDisplay.style.height = "";
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finish();
        return;
    }

    // Перший кадр малює старий час, другий запускає перехід.
    forceAnimationFrame = requestAnimationFrame(() => {
        forceAnimationFrame = requestAnimationFrame(() => {
            if (token !== forceAnimationToken) return;
            oldSpan.style.transition = "opacity 900ms ease-in-out";
            newSpan.style.transition = "opacity 900ms ease-in-out";
            oldSpan.style.opacity = "0";
            newSpan.style.opacity = "1";
            window.setTimeout(finish, 950);
        });
    });
}


function configureForceWindow() {

    forceTargetRealTime =
        Math.ceil(forcedTime / 1000) * 1000;

    forceWindowStart = Math.max(
        0,
        forceTargetRealTime - 4000
    );

}

function smoothstep(value) {

    const t = Math.max(0, Math.min(1, value));

    return t * t * (3 - 2 * t);
}

function getRealTime() {
    if (running) {
        return elapsedTime + (performance.now() - startTime);
    }

    return elapsedTime;
}




function getDisplayTime() {

    const realTime = getRealTime();

    
if (!hybridForceEnabled || forceAlreadyApplied) {
        displayedTime = realTime;
        return displayedTime;
    }

    const progress =
        (realTime - forceWindowStart) /
        (forceTargetRealTime - forceWindowStart);

    
const windowDuration =
    forceTargetRealTime - forceWindowStart;

const requestedCorrection =
    forcedTime - forceTargetRealTime;

const maxPositiveCorrection =
    windowDuration * (maxForceSpeed - 1) / 1.5;

const maxNegativeCorrection =
    windowDuration * (1 - minForceSpeed) / 1.5;

const safeCorrection = Math.max(
    -maxNegativeCorrection,
    Math.min(maxPositiveCorrection, requestedCorrection)
);

const correction =
    safeCorrection * smoothstep(progress);


    displayedTime = realTime + correction;

    return displayedTime;
}





function updateDisplay() {

    const currentTime = getDisplayTime();

    timeDisplay.textContent = formatTime(currentTime);

    updateCurrentLap();
}


function addLap() {   
const currentTotal = getDisplayTime();


    
const lapDuration =
    (Math.floor(currentTotal / 10) -
     Math.floor(lastLapTime / 10)) * 10;


    const currentRow = document.getElementById("current-lap");

    if (currentRow) {
        currentRow.removeAttribute("id");

        currentRow.querySelector(".lap-time").textContent =
            formatTime(lapDuration);

        lapRecords.push({
            duration: lapDuration,
            element: currentRow
        });
    }

    lapCount++;
    lastLapTime = currentTotal;

    updateLapColors();
    updateCurrentLap();
}

function updateCurrentLap() {

    if (!running) return;

    
const currentTotal = getDisplayTime();

    
const lapDuration =
    (Math.floor(currentTotal / 10) -
     Math.floor(lastLapTime / 10)) * 10;


    let currentRow = document.getElementById("current-lap");

    if (!currentRow) {
        currentRow = document.createElement("div");

        currentRow.id = "current-lap";
        currentRow.className = "lap-row";

        currentRow.innerHTML =
            '<span>Коло ' + (lapCount + 1) + '</span>' +
            '<span class="lap-time"></span>';

        lapsDisplay.prepend(currentRow);
    }

    currentRow.querySelector(".lap-time").textContent =
        formatTime(lapDuration);
}


function updateLapColors() {
    lapRecords.forEach(function (lap) {
        lap.element.classList.remove("fastest", "slowest");
    });

    if (lapRecords.length < 3) {
        return;
    }

    const durations = lapRecords.map(function (lap) {
        return lap.duration;
    });

    const fastestTime = Math.min(...durations);
    const slowestTime = Math.max(...durations);

    if (fastestTime === slowestTime) {
        return;
    }

    lapRecords.forEach(function (lap) {
        if (lap.duration === fastestTime) {
            lap.element.classList.add("fastest");
        }

        if (lap.duration === slowestTime) {
            lap.element.classList.add("slowest");
        }
    });
}

startButton.addEventListener("click", function () {

    if (!running) {
        cancelForceAnimation();
        timeDisplay.style.width = "";
        timeDisplay.style.height = "";
        startTime = performance.now();

        running = true;
updateCurrentLap();
        timerInterval = setInterval(updateDisplay, 10);

        startButton.textContent = "Стоп";
        startButton.style.backgroundColor = "#3b0b0b";
        startButton.style.color = "#ff453a";

        lapButton.textContent = "Коло";

    
} else {

    elapsedTime += performance.now() - startTime;

    running = false;


        clearInterval(timerInterval);

        


if (!forceAlreadyApplied) {
    const timeBeforeForce = displayedTime;

    applyForce();

    animateForcedTime(timeBeforeForce, forcedTime);
} else {
    displayedTime = elapsedTime;
    timeDisplay.textContent = formatTime(elapsedTime);
}



        startButton.textContent = "Старт";
        startButton.style.backgroundColor = "#063818";
        startButton.style.color = "#30d158";

        lapButton.textContent = "На нуль";
    }
});


lapButton.addEventListener("click", function () {

    if (running) {
        addLap();
    } else if (elapsedTime > 0) {
        cancelForceAnimation();
        timeDisplay.style.width = "";
        timeDisplay.style.height = "";
        elapsedTime = 0;
        lapCount = 0;
        lastLapTime = 0;

lapRecords = [];

        lapsDisplay.innerHTML = "";

        forceAlreadyApplied = false;
        displayedTime = 0;
        configureForceWindow();
        timeDisplay.textContent = "00:00,00";
        lapButton.textContent = "Коло";
    }
});

const secretMenu = document.getElementById("secret-menu");
const closeSecret = document.getElementById("close-secret");
const forceTimeInput = document.getElementById("force-time");

let longPressTimer = null;

timeDisplay.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;

    longPressTimer = setTimeout(function () {
        secretMenu.classList.remove("hidden");
        longPressTimer = null;
    }, 1500);
});

function cancelLongPress() {
    if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

timeDisplay.addEventListener("pointerup", cancelLongPress);
timeDisplay.addEventListener("pointerleave", cancelLongPress);
timeDisplay.addEventListener("pointercancel", cancelLongPress);


closeSecret.addEventListener("click", function () {

    const newTime = forceTimeInput.value.trim();

    const parsedTime = parseForceTime(newTime);

    if (parsedTime === null) {
        alert("Введи час у форматі 00:13,54");
        return;
    }

    const normalizedTime = formatTime(parsedTime);
    forceTimeInput.value = normalizedTime;
    localStorage.setItem("magicForceTime", normalizedTime);

    forcedTime = parsedTime;

configureForceWindow();

    secretMenu.classList.add("hidden");
});



const savedForceTime = localStorage.getItem("magicForceTime");

if (savedForceTime !== null) {
    forceTimeInput.value = savedForceTime;
}

const initialForceTime = parseForceTime(forceTimeInput.value);

if (initialForceTime !== null) {
    forcedTime = initialForceTime;
}

configureForceWindow();


// Етап 1: вкладки годинника. Секундомір не зупиняється при перемиканні.
const navigationItems = document.querySelectorAll(".bottom-menu .menu-item");
const auxiliaryScreens = {
    world: document.getElementById("screen-world"),
    alarms: document.getElementById("screen-alarms"),
    timers: document.getElementById("screen-timers")
};

function showClockScreen(screenName) {
    Object.keys(auxiliaryScreens).forEach(function (name) {
        auxiliaryScreens[name].classList.toggle("hidden", name !== screenName);
    });
    navigationItems.forEach(function (item) {
        const active = item.dataset.screen === screenName;
        item.classList.toggle("selected", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    });
}

navigationItems.forEach(function (item) {
    item.addEventListener("click", function () {
        showClockScreen(item.dataset.screen);
    });
});

const localClock = document.getElementById("local-clock");
function updateLocalClock() {
    localClock.textContent = new Intl.DateTimeFormat("uk-UA", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv", hour12: false
    }).format(new Date());
}
updateLocalClock();
setInterval(updateLocalClock, 15000);


/* Єдиний стан сторінок циферблата. Кнопки залишаються нерухомими. */
const stopwatchRoot = document.querySelector(".stopwatch");
const stopwatchDots = document.querySelectorAll(".page-dots .dot");
const dialViewport = document.getElementById("dial-viewport");
const dialTrack = document.getElementById("dial-track");
let analogMode = false;
let draggingDial = false;
let dialPointerId = null;
let dialStartX = 0;
let dialStartY = 0;
let dialDeltaX = 0;
let dialAxis = null;

function positionDial(offsetPx = 0, animate = true) {
    const width = dialViewport.clientWidth;
    // М'яке прискорення та гальмування замість різкого старту.
    dialTrack.style.transition = animate
        ? "transform 900ms cubic-bezier(0.42, 0, 0.58, 1)"
        : "none";
    dialTrack.style.transform = `translate3d(${-Number(analogMode) * width + offsetPx}px, 0, 0)`;
}

function setAnalogMode(enabled) {
    analogMode = Boolean(enabled);
    stopwatchRoot.classList.toggle("analog-mode", analogMode);
    stopwatchDots.forEach((dot, index) => {
        dot.classList.toggle("active", index === Number(analogMode));
    });
    positionDial(0, true);
}

stopwatchDots.forEach((dot, index) => {
    dot.addEventListener("click", () => setAnalogMode(index === 1));
});

// Pointer Events підтримують і дотик на iPhone, і перетягування мишею.
dialViewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!secretMenu.classList.contains("hidden")) return;
    draggingDial = true;
    dialPointerId = event.pointerId;
    dialStartX = event.clientX;
    dialStartY = event.clientY;
    dialDeltaX = 0;
    dialAxis = null;
});

dialViewport.addEventListener("pointermove", (event) => {
    if (!draggingDial || event.pointerId !== dialPointerId) return;
    const dx = event.clientX - dialStartX;
    const dy = event.clientY - dialStartY;
    if (dialAxis === null && (Math.abs(dx) > 7 || Math.abs(dy) > 7)) {
        dialAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (dialAxis === "x" && dialViewport.setPointerCapture) {
            dialViewport.setPointerCapture(event.pointerId);
        }
    }
    if (dialAxis !== "x") return;
    const width = dialViewport.clientWidth;
    dialDeltaX = Math.max(-width, Math.min(width, dx));
    // На крайніх сторінках невеликий пружний опір.
    const atEdge = (!analogMode && dialDeltaX > 0) || (analogMode && dialDeltaX < 0);
    positionDial(atEdge ? dialDeltaX * 0.18 : dialDeltaX, false);
});

function finishDialSwipe(event, cancelled = false) {
    if (!draggingDial || event.pointerId !== dialPointerId) return;
    const wasHorizontal = dialAxis === "x";
    const delta = dialDeltaX;
    draggingDial = false;
    dialPointerId = null;
    dialAxis = null;
    if (!cancelled && wasHorizontal && Math.abs(delta) > Math.min(65, dialViewport.clientWidth * 0.18)) {
        if (delta < 0) setAnalogMode(true);
        else setAnalogMode(false);
    } else {
        positionDial(0, true);
    }
}
dialViewport.addEventListener("pointerup", event => finishDialSwipe(event));
dialViewport.addEventListener("pointercancel", event => finishDialSwipe(event, true));
window.addEventListener("resize", () => positionDial(0, false));
positionDial(0, false);


/* Створення шкал аналогового секундоміра */

function createAnalogDial() {
    const svgNS = "http://www.w3.org/2000/svg";

    const outerTicks = document.getElementById("analog-ticks");
    const outerNumbers = document.getElementById("analog-numbers");
    const innerTicks = document.getElementById("analog-inner-ticks");
    const innerNumbers = document.getElementById("analog-inner-numbers");

    function addLine(parent, x1, y1, x2, y2, color, width, rotation) {
        const line = document.createElementNS(svgNS, "line");

        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", width);
        line.setAttribute("transform", rotation);

        parent.appendChild(line);
    }

    function addNumber(parent, value, x, y, size) {
        const number = document.createElementNS(svgNS, "text");

        number.setAttribute("x", x);
        number.setAttribute("y", y);
        number.setAttribute("fill", "#ffffff");
        number.setAttribute("font-size", size);
        number.setAttribute("font-weight", "300");
        number.setAttribute("text-anchor", "middle");

        number.textContent = value;
        parent.appendChild(number);
    }

    // Зовнішня шкала: 300 поділок
    for (let i = 0; i < 300; i++) {
        const major = i % 25 === 0;
        const medium = i % 5 === 0;

        addLine(
            outerTicks,
            200,
            major ? 8 : medium ? 12 : 16,
            200,
            24,
            major ? "#ffffff" : "#48484a",
            major ? 2.2 : 1.4,
            `rotate(${i * 1.2} 200 200)`
        );
    }

    // Великі цифри зовнішньої шкали
    for (let i = 1; i <= 12; i++) {
        const angle = (i * 30 - 90) * Math.PI / 180;

        const x = 200 + Math.cos(angle) * 151;
        const y = 200 + Math.sin(angle) * 151 + 9;

        addNumber(
            outerNumbers,
            i * 5,
            x,
            y,
            29
        );
    }

    // Внутрішня шкала
    for (let i = 0; i < 60; i++) {
        addLine(
            innerTicks,
            200,
            i % 10 === 0 ? 76 : 81,
            200,
            88,
            "#48484a",
            1.4,
            `rotate(${i * 6} 200 129)`
        );
    }

    // Цифри внутрішньої шкали
    for (let i = 1; i <= 6; i++) {
        const angle = (i * 60 - 90) * Math.PI / 180;

        const x = 200 + Math.cos(angle) * 35;
        const y = 129 + Math.sin(angle) * 35 + 6;

        addNumber(
            innerNumbers,
            i * 5,
            x,
            y,
            17
        );
    }
}

createAnalogDial();


/* ОНОВЛЕННЯ АНАЛОГОВОГО СЕКУНДОМІРА */

function updateAnalogClock() {

    const secondsHand =
        document.getElementById("analog-second-hand");

    const minutesHand =
        document.getElementById("analog-minute-hand");

    const analogTime =
        document.getElementById("analog-time");

    if (!secondsHand || !minutesHand || !analogTime) {
        return;
    }

    const currentTime = running
        ? getDisplayTime()
        : elapsedTime;

    const secondsAngle =
        (currentTime % 60000) / 60000 * 360;

    const minutesAngle =
        (currentTime % 1800000) / 1800000 * 360;

    secondsHand.setAttribute(
        "transform",
        `rotate(${secondsAngle} 200 200)`
    );

    minutesHand.setAttribute(
        "transform",
        `rotate(${minutesAngle} 200 129)`
    );

    analogTime.textContent = formatTime(currentTime);
}

setInterval(updateAnalogClock, 30);
updateAnalogClock();


// v10: magic square linked to the forced stopwatch reading.
const squareTargetInput = document.getElementById("square-target");
const squareGenerateButton = document.getElementById("square-generate");
const squareResult = document.getElementById("square-result");
const squareBase = [16,3,2,13, 5,10,11,8, 9,6,7,12, 4,15,14,1];
const squareCorrectionColumns = [0,2,3,1];

function squareTargetFromForce(milliseconds) {
    // The digits displayed on the stopwatch are the magic constant.
    // 00:09,24 -> 924; 00:13,54 -> 1354; 01:23,45 -> 12345.
    return Number(formatTime(milliseconds).replace(/\D/g, ""));
}

function generateMagicSquare(target) {
    if (!Number.isSafeInteger(target) || target < 0) return null;
    const delta = target - 34;
    const q = Math.floor(delta / 4);
    const r = delta - q * 4;
    const base = squareBase.map((n, i) => n + q +
        (squareCorrectionColumns[Math.floor(i / 4)] === i % 4 ? r : 0));

    // A rank-one zero-sum matrix keeps every row, column and BOTH
    // diagonals unchanged: rows [a,b,-b,-a], columns [c,d,-d,-c].
    // Two such independent matrices yield a much broader numeric spread.
    // Deterministic pseudo-random search avoids changing the layout on each render.
    let seed = (target ^ 0x5f3759df) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const avg = target / 4;
    let best = null;
    let bestScore = -Infinity;
    const tries = target >= 150 ? 3500 : 400;
    for (let k = 0; k < tries; k++) {
        const amplitude = Math.max(1, Math.floor(avg * 0.92));
        const a = Math.round((rand() * 2 - 1) * amplitude);
        const b = Math.round((rand() * 2 - 1) * amplitude);
        const c = Math.round((rand() * 2 - 1) * amplitude);
        const d = Math.round((rand() * 2 - 1) * amplitude);
        const e = Math.round((rand() * 2 - 1) * amplitude * 0.5);
        const f = Math.round((rand() * 2 - 1) * amplitude * 0.5);
        const rows1 = [a,b,-b,-a], cols1 = [1,-1,-1,1];
        const rows2 = [1,-1,-1,1], cols2 = [c,d,-d,-c];
        const rows3 = [e,f,-f,-e], cols3 = [1,-1,-1,1];
        const result = base.map((n,i) => n + rows1[Math.floor(i/4)]*cols1[i%4]
            + rows2[Math.floor(i/4)]*cols2[i%4]
            + rows3[Math.floor(i/4)]*cols3[i%4]);
        if (!result.every(Number.isSafeInteger) || Math.min(...result) < 1) continue;
        const unique = new Set(result).size;
        if (unique !== 16) continue;
        const sorted = [...result].sort((x,y)=>x-y);
        const spread = sorted[15]-sorted[0];
        const gaps = sorted.slice(1).map((v,i)=>v-sorted[i]);
        const score = spread + Math.min(...gaps)*0.3 - Math.abs(sorted[0] - Math.max(1,target*0.015))*0.2;
        if (score > bestScore) { bestScore=score; best=result; }
    }
    return best || base;
}
function renderMagicSquare() {
    const parsed = parseForceTime(forceTimeInput.value.trim());
    if (parsed === null) {
        squareTargetInput.value = "";
        squareResult.textContent = "Спочатку введи коректний форсований час, наприклад 00:13,54.";
        return;
    }
    const target = squareTargetFromForce(parsed);
    squareTargetInput.value = String(target);
    const square = generateMagicSquare(target);
    if (!square || square.some(n => !Number.isSafeInteger(n))) {
        squareResult.textContent = "Не вдалося створити квадрат для цього значення.";
        return;
    }
    squareResult.replaceChildren(...square.map(value => {
        const cell = document.createElement("div");
        cell.className = "square-cell";
        cell.textContent = String(value);
        return cell;
    }));
}
squareGenerateButton.addEventListener("click", renderMagicSquare);
forceTimeInput.addEventListener("input", renderMagicSquare);
renderMagicSquare();
