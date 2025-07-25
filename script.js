document.addEventListener("DOMContentLoaded", () => {
  createMonthYearSelectors();
  createTable();
  updateMonthSummary();
  setupEventListeners();
});

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const startHour = 4;
const endHour = 21;
let currentWeekStart = getStartOfWeek(new Date());

let lastSelectedCell = null;

// Track the last clicked cell
document.addEventListener("click", (e) => {
  if (e.target.tagName === "TD" && e.target.isContentEditable) {
    lastSelectedCell = e.target;
  }
});
document.getElementById("repeat-daily-btn").addEventListener("click", () => {
  if (!lastSelectedCell) {
    alert("Please click on a task cell first.");
    return;
  }

  const row = lastSelectedCell.parentElement;
  const task = lastSelectedCell.textContent.trim();

  if (!task) {
    alert("Selected cell is empty.");
    return;
  }

  const table = document.querySelector("table");
  const weekDates = [];

  // Get actual date values from header row
  const dateHeaders = document.querySelectorAll(".week-row th");
  for (let i = 1; i < dateHeaders.length; i++) {
    const parsedDate = new Date(dateHeaders[i].dataset.date);
    weekDates.push(parsedDate);
  }

  // Apply the task to all cells in the same row (time slot)
  const cells = row.querySelectorAll("td[contenteditable='true']");
  cells.forEach((cell, idx) => {
    cell.textContent = task;
    cell.classList.add("repeated-cell");

    const dateStr = formatDate(weekDates[idx]);
    const hourStr = row.querySelector(".time-col").textContent.split(" - ")[0];

    let taskData = {};
    const saved = localStorage.getItem(getStorageKey(dateStr));
    if (saved) {
      try {
        taskData = JSON.parse(saved);
      } catch (e) {
        console.error("Corrupt localStorage data:", e);
        localStorage.removeItem(getStorageKey(dateStr));
      }
    }

    taskData[hourStr] = { text: task, repeated: true };
    localStorage.setItem(getStorageKey(dateStr), JSON.stringify(taskData));
  });
});

function getStartOfWeek(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getStorageKey(dateStr) {
  return `taskData-${dateStr}`;
}

function createMonthYearSelectors() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");

  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = new Date(0, m).toLocaleString("default", {
      month: "long",
    });
    monthSelect.appendChild(opt);
  }

  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  monthSelect.value = currentWeekStart.getMonth();
  yearSelect.value = currentWeekStart.getFullYear();

  monthSelect.addEventListener("change", updateTableForMonthYear);
  yearSelect.addEventListener("change", updateTableForMonthYear);
}

function createTable() {
  const container = document.getElementById("table-container");
  container.innerHTML = "";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.classList.add("week-row");

  const timeHeader = document.createElement("th");
  timeHeader.textContent = "Time";
  timeHeader.classList.add("time-col");
  headerRow.appendChild(timeHeader);

  const weekDates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(
      currentWeekStart.getFullYear(),
      currentWeekStart.getMonth(),
      currentWeekStart.getDate() + i
    );
    weekDates.push(date);

    const th = document.createElement("th");
    th.dataset.date = formatDate(date); // store yyyy-mm-dd format

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();

    const textColor = isToday ? "#000" : "#fff";

    const dayShort = daysOfWeek[date.getDay()].slice(0, 3);
    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    th.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; color: ${textColor};">
              <div style="font-weight: bold; font-size: 1.1em;">${dayShort}</div>
              <div style="font-size: 0.95em;">${formattedDate}</div>
            </div>`;

    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (let hour = startHour; hour <= endHour; hour++) {
    const row = document.createElement("tr");
    const timeCell = document.createElement("td");
    timeCell.classList.add("time-col");
    const nextHour = hour + 1;
    timeCell.textContent = `${hour}:00 - ${nextHour}:00`;

    row.appendChild(timeCell);

    for (let day = 0; day < 7; day++) {
      const cell = document.createElement("td");
      cell.contentEditable = "true";

      const dateStr = formatDate(weekDates[day]);
      const hourStr = `${hour}:00`;

      const storedData = localStorage.getItem(getStorageKey(dateStr));
      if (storedData) {
        const taskObj = JSON.parse(storedData);
        const cellData = taskObj[hourStr];

        if (typeof cellData === "string") {
          cell.textContent = cellData; // legacy support
        } else if (cellData && typeof cellData === "object") {
          cell.textContent = cellData.text || "";
          if (cellData.repeated) {
            cell.classList.add("repeated-cell");
          }
        }
      }

      cell.addEventListener("input", () => {
        const updatedTask = cell.textContent;
        let taskData = {};
        const saved = localStorage.getItem(getStorageKey(dateStr));
        if (saved) {
          try {
            taskData = JSON.parse(saved);
          } catch (e) {
            console.error("Corrupt localStorage data:", e);
            localStorage.removeItem(getStorageKey(dateStr));
          }
        }

        const prevData = taskData[hourStr];
        const wasRepeated =
          prevData && typeof prevData === "object" && prevData.repeated;

        taskData[hourStr] = {
          text: updatedTask,
          repeated: wasRepeated || false,
        };

        localStorage.setItem(getStorageKey(dateStr), JSON.stringify(taskData));
      });

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}


function setupEventListeners() {
  document.getElementById("prev-week-btn").addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    syncSelectorsToCurrentWeek();
    createTable();
    updateMonthSummary();
  });

  document.getElementById("next-week-btn").addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    syncSelectorsToCurrentWeek();
    createTable();
    updateMonthSummary();
  });
}

document.getElementById("delete-repeats-btn").addEventListener("click", () => {
  if (!lastSelectedCell) {
    alert("Please click on a task cell first.");
    return;
  }

  const row = lastSelectedCell.parentElement;
  const table = document.querySelector("table");
  const dateHeaders = document.querySelectorAll(".week-row th");
  const weekDates = [];

  for (let i = 1; i < dateHeaders.length; i++) {
    const parsedDate = new Date(dateHeaders[i].dataset.date);
    weekDates.push(parsedDate);
  }

  const cells = row.querySelectorAll("td[contenteditable='true']");
  cells.forEach((cell, idx) => {
    const dateStr = formatDate(weekDates[idx]);
    const hourStr = row.querySelector(".time-col").textContent.split(" - ")[0];

    let taskData = {};
    const saved = localStorage.getItem(getStorageKey(dateStr));
    if (saved) {
      try {
        taskData = JSON.parse(saved);
      } catch (e) {
        console.error("Corrupt localStorage data:", e);
        localStorage.removeItem(getStorageKey(dateStr));
      }
    }

    if (taskData[hourStr] && taskData[hourStr].repeated) {
      delete taskData[hourStr];
      localStorage.setItem(getStorageKey(dateStr), JSON.stringify(taskData));
      cell.textContent = "";
      cell.classList.remove("repeated-cell");
    }
  });
});

function syncSelectorsToCurrentWeek() {
  document.getElementById("month-select").value = currentWeekStart.getMonth();
  document.getElementById("year-select").value = currentWeekStart.getFullYear();
}

function updateTableForMonthYear() {
  const month = parseInt(document.getElementById("month-select").value);
  const year = parseInt(document.getElementById("year-select").value);
  const newDate = new Date(year, month);
  currentWeekStart = getStartOfWeek(newDate);
  createTable();
  updateMonthSummary();
}

function updateMonthSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  let daysLeft = 0;
  if (today <= monthEnd) {
    daysLeft = Math.floor((monthEnd - today) / (1000 * 60 * 60 * 24)) + 1;
  }

  const formatter = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  });

  const todayFormatted = formatter.format(today);       // e.g. "16 Jun"
  const monthEndFormatted = formatter.format(monthEnd); // e.g. "30 Jun"

  const summaryText = `${todayFormatted} - ${monthEndFormatted} (Left-${daysLeft})`;

  const summaryElement = document.getElementById("month-summary");
  summaryElement.textContent = summaryText;

  // Optional: highlight if today is in this week
  const weekStart = new Date(currentWeekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const isThisWeek = today >= weekStart && today <= weekEnd;
  summaryElement.style.fontWeight = isThisWeek ? "bold" : "normal";
  summaryElement.style.color = isThisWeek ? "#22c55e" : "#fff";
}



document.getElementById("dark-mode-toggle").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "darkModeEnabled",
    document.body.classList.contains("dark-mode")
  );
});

// Apply on page load if user enabled it
if (localStorage.getItem("darkModeEnabled") === "true") {
  document.body.classList.add("dark-mode");
}


document.addEventListener("keydown", (e) => {
  if (!lastSelectedCell) return;

  const cell = lastSelectedCell;
  const row = cell.parentElement;
  const table = cell.closest("table");

  const cellIndex = Array.from(row.children).indexOf(cell);
  const rowIndex = Array.from(table.rows).indexOf(row);

  let targetCell = null;

  switch (e.key) {
    case "ArrowRight":
      if (cellIndex + 1 < row.cells.length) {
        targetCell = row.cells[cellIndex + 1];
      }
      break;
    case "ArrowLeft":
      if (cellIndex - 1 >= 0) { 
        targetCell = row.cells[cellIndex - 1];
      }
      break;
    case "ArrowDown":
      if (rowIndex + 1 < table.rows.length) {
        targetCell = table.rows[rowIndex + 1].cells[cellIndex];
      }
      break;
    case "ArrowUp":
      if (rowIndex - 1 >= 0) {
        targetCell = table.rows[rowIndex - 1].cells[cellIndex];
      }
      break;
  }

  if (targetCell && targetCell.isContentEditable) {
    e.preventDefault(); // prevent cursor jump
    targetCell.focus();
    lastSelectedCell = targetCell;
  }
});


document.getElementById("clear-week-btn").addEventListener("click", () => {
  if (!confirm("Are you sure you want to clear all tasks for this week?"))
    return;

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDates.push(formatDate(date));
  }

  weekDates.forEach((dateStr) => {
    localStorage.removeItem(getStorageKey(dateStr));
  });

  createTable();
});
