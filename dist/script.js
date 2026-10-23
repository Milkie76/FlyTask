"use strict";
const getElement = (selector) => {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`Элемент не найден: ${selector}`);
    return element;
};
const titleInput = getElement("#task-title");
const descInput = getElement("#task-desc");
const deadlineInput = getElement("#task-deadline");
const createButton = getElement("#create-btn");
const tasksBody = getElement("#tasks-body");
const completedList = getElement("#completed-list");
const searchInput = getElement(".Search_Input");
const sortButton = getElement(".Sort_Btn");
const filterButtons = document.querySelectorAll(".Tasks_Filters button");
let tasks = loadTasks();
let currentFilter = "all";
let currentNavigation = "all";
let searchQuery = "";
let sortAscending = true;
function loadTasks() {
    try {
        const saved = localStorage.getItem("tasks");
        if (!saved)
            return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((item) => typeof item === "object" &&
            item !== null &&
            typeof item.id === "number" &&
            typeof item.title === "string" &&
            typeof item.description === "string" &&
            typeof item.deadline === "string" &&
            typeof item.completed === "boolean" &&
            (typeof item.completedAt === "string" || item.completedAt === null));
    }
    catch {
        return [];
    }
}
function saveTasks() {
    try {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }
    catch {
        alert("Не удалось сохранить задачи в браузере.");
    }
}
function clearForm() {
    titleInput.value = "";
    descInput.value = "";
    deadlineInput.value = "";
}
function getTodayString() {
    const today = new Date();
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}
function isOverdue(deadline) {
    return Boolean(deadline) && deadline < getTodayString();
}
function isToday(deadline) {
    return Boolean(deadline) && deadline === getTodayString();
}
function isThisWeek(deadline) {
    if (!deadline)
        return false;
    const date = new Date(`${deadline}T12:00:00`);
    if (Number.isNaN(date.getTime()))
        return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - day);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return date >= monday && date <= sunday;
}
function formatDate(dateString) {
    if (!dateString)
        return "—";
    const [year, month, day] = dateString.split("-");
    return `${day}.${month}.${year}`;
}
function createTask() {
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const deadline = deadlineInput.value;
    if (!title) {
        alert("Введите название задачи");
        titleInput.focus();
        return;
    }
    tasks.push({
        id: Date.now(),
        title,
        description,
        deadline,
        completed: false,
        completedAt: null
    });
    saveTasks();
    currentFilter = "all";
    currentNavigation = "all";
    updateFilterButtons();
    updateNavigationHighlight();
    renderTasks();
    clearForm();
}
function toggleTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task)
        return;
    task.completed = !task.completed;
    if (task.completed) {
        task.completedAt = new Date().toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short"
        });
    }
    else {
        task.completedAt = null;
    }
    saveTasks();
    renderTasks();
}
function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task)
        return;
    if (!confirm(`Удалить задачу «${task.title}»?`))
        return;
    tasks = tasks.filter(item => item.id !== id);
    saveTasks();
    renderTasks();
}
function createCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className)
        cell.className = className;
    return cell;
}
function matchesNavigation(task) {
    switch (currentNavigation) {
        case "all":
            return true;
        case "active":
            return !task.completed;
        case "completed":
            return task.completed;
        case "today":
            return !task.completed && isToday(task.deadline);
        case "overdue":
            return !task.completed && isOverdue(task.deadline);
        case "week":
            return !task.completed && isThisWeek(task.deadline);
    }
}
function renderTasks() {
    tasksBody.replaceChildren();
    completedList.replaceChildren();
    const filtered = tasks.filter(task => {
        const matchesFilter = currentFilter === "all" ||
            (currentFilter === "active" && !task.completed) ||
            (currentFilter === "completed" && task.completed);
        const matchesSearch = task.title
            .toLocaleLowerCase("ru")
            .includes(searchQuery.toLocaleLowerCase("ru"));
        return matchesFilter && matchesNavigation(task) && matchesSearch;
    });
    filtered.sort((a, b) => {
        const dateA = a.deadline || "9999-12-31";
        const dateB = b.deadline || "9999-12-31";
        return sortAscending
            ? dateA.localeCompare(dateB)
            : dateB.localeCompare(dateA);
    });
    for (const task of filtered) {
        const row = document.createElement("tr");
        const checkboxCell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "Task_Checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Выполнить: ${task.title}`);
        checkbox.addEventListener("change", () => toggleTask(task.id));
        checkboxCell.append(checkbox);
        row.append(checkboxCell);
        row.append(createCell(task.title, "Task_Name"));
        row.append(createCell(task.description || "—", "Task_Desc"));
        row.append(createCell(formatDate(task.deadline)));
        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = "Status";
        if (task.completed) {
            status.classList.add("Status_Active");
            status.textContent = "Выполнено";
        }
        else if (isOverdue(task.deadline)) {
            status.classList.add("Status_Overdue");
            status.textContent = "Просрочено";
        }
        else {
            status.classList.add("Status_Active");
            status.textContent = "Активно";
        }
        statusCell.append(status);
        row.append(statusCell);
        const actionsCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.className = "Actions_Btn";
        deleteButton.textContent = "×";
        deleteButton.title = "Удалить задачу";
        deleteButton.setAttribute("aria-label", `Удалить: ${task.title}`);
        deleteButton.addEventListener("click", () => deleteTask(task.id));
        actionsCell.append(deleteButton);
        row.append(actionsCell);
        tasksBody.append(row);
    }
    if (filtered.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell("Задачи не найдены");
        cell.colSpan = 6;
        cell.style.textAlign = "center";
        row.append(cell);
        tasksBody.append(row);
    }
    const completedTasks = tasks
        .filter(task => task.completed)
        .sort((a, b) => b.id - a.id);
    for (const task of completedTasks) {
        const item = document.createElement("div");
        item.className = "Completed_Item";
        const title = document.createElement("h4");
        title.className = "Completed_Item_Title";
        title.textContent = task.title;
        const date = document.createElement("span");
        date.className = "Completed_Item_Date";
        date.textContent = `✓ Выполнено ${task.completedAt ?? ""}`;
        item.append(title, date);
        completedList.append(item);
    }
}
function updateFilterButtons() {
    filterButtons.forEach(button => {
        const text = button.textContent?.trim();
        const active = currentNavigation === "all" &&
            ((currentFilter === "all" && text === "Все") ||
                (currentFilter === "active" && text === "Активные") ||
                (currentFilter === "completed" && text === "Выполненные"));
        button.classList.toggle("Filters_Btn_Active", active);
        button.classList.toggle("Filters_Btn", !active);
    });
}
function getNavigationFilter(text) {
    const value = text.toLocaleLowerCase("ru").replace(/\s+/g, " ").trim();
    if (value === "все" || value.includes("все задачи"))
        return "all";
    if (value.includes("активные"))
        return "active";
    if (value.includes("выполненные") ||
        value.includes("завершённые") ||
        value.includes("завершенные")) {
        return "completed";
    }
    if (value.includes("сегодня"))
        return "today";
    if (value.includes("просроч"))
        return "overdue";
    if (value.includes("недел"))
        return "week";
    return null;
}
function updateNavigationHighlight() {
    navigationItems.forEach(item => {
        const filter = getNavigationFilter(item.textContent ?? "");
        item.classList.toggle("Nav_Item_Active", filter !== null && filter === currentNavigation);
    });
}
function selectNavigation(filter) {
    currentNavigation = filter;
    currentFilter = "all";
    updateFilterButtons();
    updateNavigationHighlight();
    renderTasks();
}
createButton.addEventListener("click", createTask);
titleInput.addEventListener("keydown", event => {
    if (event.key === "Enter")
        createTask();
});
filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        const text = button.textContent?.trim();
        if (text === "Все")
            currentFilter = "all";
        else if (text === "Активные")
            currentFilter = "active";
        else if (text === "Выполненные")
            currentFilter = "completed";
        else
            return;
        currentNavigation = "all";
        updateFilterButtons();
        updateNavigationHighlight();
        renderTasks();
    });
});
searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim();
    renderTasks();
});
sortButton.addEventListener("click", () => {
    sortAscending = !sortAscending;
    sortButton.textContent = sortAscending
        ? "Сначала ранние"
        : "Сначала поздние";
    renderTasks();
});
// Навигация бокового меню.
// Если класс боковой панели в HTML другой, этот селектор нужно изменить.
const navigationItems = document.querySelectorAll(".Sidebar .Nav_Item, " +
    ".Sidebar .Nav_Item_Active, " +
    ".Sidebar .Sidebar_Item, " +
    ".Sidebar a, " +
    ".Sidebar button, " +
    ".Sidebar li");
navigationItems.forEach(item => {
    item.style.cursor = "pointer";
    item.addEventListener("click", event => {
        const filter = getNavigationFilter(item.textContent ?? "");
        if (!filter)
            return;
        event.preventDefault();
        selectNavigation(filter);
    });
});
updateFilterButtons();
updateNavigationHighlight();
renderTasks();
