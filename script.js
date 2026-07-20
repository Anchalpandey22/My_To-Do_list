/* =========================================================
   GRABBING DOM ELEMENTS
   ========================================================= */
const taskInput = document.getElementById("taskInput");
const taskPriority = document.getElementById("taskPriority");
const taskCategory = document.getElementById("taskCategory");
const addBtn = document.getElementById("addBtn");
const errorMsg = document.getElementById("errorMsg");
const taskList = document.getElementById("taskList");
const emptyMsg = document.getElementById("emptyMsg");
const taskCount = document.getElementById("taskCount");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterBtns = document.querySelectorAll(".filter-btn");

// Progress elements
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");

// Settings elements
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const themePills = document.querySelectorAll(".theme-pill");
const wpPills = document.querySelectorAll(".wp-pill");

// Backup elements
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

/* =========================================================
   APPLICATION STATE (LOADED FROM LOCAL STORAGE)
   ========================================================= */
let tasks = [];
let currentFilter = "all";
let currentTheme = "theme-sunset";
let currentWallpaper = "wp-midnight";

/* =========================================================
   LOCAL STORAGE HELPERS
   ========================================================= */
function saveTasksToStorage() {
  localStorage.setItem("zenTodoTasks", JSON.stringify(tasks));
}

function loadTasksFromStorage() {
  const savedTasks = localStorage.getItem("zenTodoTasks");
  if (savedTasks) {
    try {
      tasks = JSON.parse(savedTasks);
      // Ensure all tasks have priority & category fields
      tasks = tasks.map(task => ({
        id: task.id,
        text: task.text,
        completed: task.completed,
        priority: task.priority || "medium",
        category: task.category || "Personal"
      }));
    } catch (e) {
      console.error("Error parsing tasks from local storage", e);
      tasks = [];
    }
  }
}

function saveSettingsToStorage() {
  localStorage.setItem("zenTodoTheme", currentTheme);
  localStorage.setItem("zenTodoWallpaper", currentWallpaper);
}

function loadSettingsFromStorage() {
  const savedTheme = localStorage.getItem("zenTodoTheme");
  const savedWallpaper = localStorage.getItem("zenTodoWallpaper");

  if (savedTheme) currentTheme = savedTheme;
  if (savedWallpaper) currentWallpaper = savedWallpaper;

  applyThemeAndWallpaper();
}

function applyThemeAndWallpaper() {
  // Reset existing classes on body
  document.body.className = "";
  document.body.classList.add(currentTheme, currentWallpaper);

  // Update pills UI
  themePills.forEach(pill => {
    if (pill.getAttribute("data-theme") === currentTheme.replace("theme-", "")) {
      pill.classList.add("selected");
    } else {
      pill.classList.remove("selected");
    }
  });

  wpPills.forEach(pill => {
    if (pill.getAttribute("data-wp") === currentWallpaper.replace("wp-", "")) {
      pill.classList.add("selected");
    } else {
      pill.classList.remove("selected");
    }
  });
}

/* =========================================================
   PROGRESS TRACKING CALCULATION
   ========================================================= */
function updateProgress() {
  if (tasks.length === 0) {
    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";
    return;
  }

  const completedCount = tasks.filter(task => task.completed).length;
  const percentage = Math.round((completedCount / tasks.length) * 100);

  progressBar.style.width = percentage + "%";
  progressPercent.textContent = percentage + "%";
}

/* =========================================================
   RENDER FUNCTION
   ========================================================= */
function renderTasks() {
  // Clear currently rendered items
  taskList.innerHTML = "";

  // Filter tasks based on current tab selection
  let visibleTasks = tasks;
  if (currentFilter === "active") {
    visibleTasks = tasks.filter(task => !task.completed);
  } else if (currentFilter === "completed") {
    visibleTasks = tasks.filter(task => task.completed);
  }

  // Handle empty state visibility
  if (visibleTasks.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
  }

  // Create task items dynamically
  visibleTasks.forEach(task => {
    const li = document.createElement("li");
    li.className = "task-item";
    if (task.completed) {
      li.classList.add("completed-item");
    }

    // Task Left: Custom checkbox + Text wrapper (with title & tags)
    const leftDiv = document.createElement("div");
    leftDiv.className = "task-left";

    // Custom SVG Checkbox
    const customCheck = document.createElement("div");
    customCheck.className = "custom-checkbox";
    if (task.completed) {
      customCheck.classList.add("checked");
    }

    // SVG element creation
    const svgNS = "http://www.w3.org/2000/svg";
    const checkSvg = document.createElementNS(svgNS, "svg");
    checkSvg.setAttribute("viewBox", "0 0 24 24");
    const checkPolyline = document.createElementNS(svgNS, "polyline");
    checkPolyline.setAttribute("points", "20 6 9 17 4 12");
    checkSvg.appendChild(checkPolyline);
    customCheck.appendChild(checkSvg);

    customCheck.addEventListener("click", () => {
      toggleComplete(task.id);
    });

    // Content Wrapper (Holds text and badges)
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "task-content-wrapper";

    // Task Text Span
    const taskText = document.createElement("span");
    taskText.textContent = task.text;
    taskText.className = "task-text";
    if (task.completed) {
      taskText.classList.add("completed");
    }

    // Inline Editing Handlers (Double Click)
    taskText.addEventListener("dblclick", () => {
      if (task.completed) return; // Prevent editing completed tasks
      taskText.contentEditable = true;
      taskText.focus();

      // Put cursor at the end
      const range = document.createRange();
      range.selectNodeContents(taskText);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    taskText.addEventListener("blur", () => {
      taskText.contentEditable = false;
      const updatedValue = taskText.textContent.trim();
      if (updatedValue === "") {
        taskText.textContent = task.text; // reset on blank edit
      } else if (updatedValue !== task.text) {
        editTask(task.id, updatedValue);
      }
    });

    taskText.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        taskText.blur();
      }
    });

    // Badges (Priority & Category)
    const badgesContainer = document.createElement("div");
    badgesContainer.className = "task-badges";

    const priorityBadge = document.createElement("span");
    priorityBadge.className = `badge priority-${task.priority}`;
    priorityBadge.textContent = `${task.priority} prio`;

    const categoryBadge = document.createElement("span");
    categoryBadge.className = "badge category";
    categoryBadge.textContent = task.category;

    badgesContainer.appendChild(priorityBadge);
    badgesContainer.appendChild(categoryBadge);

    contentWrapper.appendChild(taskText);
    contentWrapper.appendChild(badgesContainer);

    leftDiv.appendChild(customCheck);
    leftDiv.appendChild(contentWrapper);

    // Actions Group: Edit + Delete SVG Buttons
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "task-actions";

    // Edit Button Trigger
    const editBtn = document.createElement("button");
    editBtn.className = "action-btn edit-btn";
    editBtn.title = "Edit Task Description (or double click text)";
    editBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editBtn.addEventListener("click", () => {
      if (task.completed) return;
      taskText.contentEditable = true;
      taskText.focus();
    });

    // Delete Button Trigger
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.title = "Delete Task";
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    deleteBtn.addEventListener("click", () => {
      li.style.animation = "fadeOut 0.2s ease forwards";
      setTimeout(() => {
        deleteTask(task.id);
      }, 200);
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(leftDiv);
    li.appendChild(actionsDiv);
    taskList.appendChild(li);
  });

  // Footer status updater
  const activeCount = tasks.filter(task => !task.completed).length;
  taskCount.textContent = `${activeCount} task${activeCount !== 1 ? "s" : ""} left`;

  // Update progress bar status
  updateProgress();
}

/* =========================================================
   TASK CRUD OPERATIONS
   ========================================================= */
function addTask() {
  const textValue = taskInput.value.trim();
  const priorityValue = taskPriority.value;
  const categoryValue = taskCategory.value;

  if (textValue === "") {
    errorMsg.textContent = "Please type a task before adding.";
    return;
  }

  errorMsg.textContent = ""; // Clear any errors

  const newTask = {
    id: Date.now(),
    text: textValue,
    completed: false,
    priority: priorityValue,
    category: categoryValue
  };

  tasks.push(newTask);
  saveTasksToStorage();
  renderTasks();

  taskInput.value = "";
  taskInput.focus();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasksToStorage();
  renderTasks();
}

function toggleComplete(id) {
  tasks = tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
  saveTasksToStorage();
  renderTasks();
}

function editTask(id, updatedText) {
  tasks = tasks.map(task => {
    if (task.id === id) {
      return { ...task, text: updatedText };
    }
    return task;
  });
  saveTasksToStorage();
  renderTasks();
}

/* =========================================================
   EVENT LISTENERS & BINDINGS
   ========================================================= */

// Task insertion triggers
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTask();
  }
});

// Clear completed items
clearCompletedBtn.addEventListener("click", () => {
  tasks = tasks.filter(task => !task.completed);
  saveTasksToStorage();
  renderTasks();
});

// Settings Drawer Toggle
settingsToggle.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
});

// Theme Selector Pill Bindings
themePills.forEach(pill => {
  pill.addEventListener("click", () => {
    const selectedThemeName = `theme-${pill.getAttribute("data-theme")}`;
    currentTheme = selectedThemeName;
    saveSettingsToStorage();
    applyThemeAndWallpaper();
  });
});

// Wallpaper Selector Pill Bindings
wpPills.forEach(pill => {
  pill.addEventListener("click", () => {
    const selectedWpName = `wp-${pill.getAttribute("data-wp")}`;
    currentWallpaper = selectedWpName;
    saveSettingsToStorage();
    applyThemeAndWallpaper();
  });
});

// Filter Tab Switchers
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.getAttribute("data-filter");
    renderTasks();
  });
});

/* =========================================================
   DATA BACKUP ACTIONS (JSON IMPORT/EXPORT)
   ========================================================= */

// Export data to json file download
exportBtn.addEventListener("click", () => {
  if (tasks.length === 0) {
    alert("There are no tasks to export!");
    return;
  }
  const dataStr = JSON.stringify(tasks, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const exportFileDefaultName = 'zentask_backup.json';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
});

// Import trigger file uploader click
importBtn.addEventListener("click", () => {
  importFile.click();
});

// Import file selection listener
importFile.addEventListener("change", (e) => {
  const fileReader = new FileReader();
  const file = e.target.files[0];

  if (!file) return;

  fileReader.onload = (event) => {
    try {
      const parsedData = JSON.parse(event.target.result);
      if (Array.isArray(parsedData)) {
        // Simple verification that structure is valid
        const validatedTasks = parsedData.map((task, idx) => {
          if (!task.text) throw new Error(`Invalid item at position ${idx}`);
          return {
            id: task.id || Date.now() + idx,
            text: task.text,
            completed: !!task.completed,
            priority: task.priority || "medium",
            category: task.category || "Personal"
          };
        });

        tasks = validatedTasks;
        saveTasksToStorage();
        renderTasks();
        alert("Tasks successfully imported!");
      } else {
        alert("Invalid file format. Must be a JSON array of tasks.");
      }
    } catch (err) {
      alert("Error reading file: " + err.message);
    }
  };

  fileReader.readAsText(file);
  // Clear input value so uploader can be re-triggered for same file name
  importFile.value = "";
});

/* =========================================================
   INITIAL STARTUP & SEEDING
   ========================================================= */
loadSettingsFromStorage();
loadTasksFromStorage();
renderTasks();
