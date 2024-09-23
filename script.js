// IndexedDB存储实现
let db;
const request = indexedDB.open('MusicFestivalDB', 1);

request.onupgradeneeded = function (e) {
    db = e.target.result;
    const objectStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
    objectStore.createIndex('year', 'year', { unique: false });
    objectStore.createIndex('date', 'date', { unique: false });
    objectStore.createIndex('location', 'location', { unique: false });
    objectStore.createIndex('remarks', 'remarks', { unique: false });
};

request.onsuccess = function (e) {
    db = e.target.result;
    displayEvents();
};

document.getElementById('eventForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const year = document.getElementById('year').value;
    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const remarks = document.getElementById('remarks').value;

    const bandPhoto = document.getElementById('band-photo').files[0];
    const livePhoto = document.getElementById('live-photo').files[0];
    const video = document.getElementById('video').files[0];

    const newEvent = {
        year,
        date,
        location,
        remarks,
        bandPhoto,
        livePhoto,
        video
    };

    const transaction = db.transaction(['events'], 'readwrite');
    const objectStore = transaction.objectStore('events');
    objectStore.add(newEvent);

    transaction.oncomplete = function () {
        displayEvents();
    };
});

function displayEvents() {
    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.getAll();

    request.onsuccess = function () {
        const events = request.result;
        const timelineContainer = document.querySelector('.timeline-container');
        timelineContainer.innerHTML = '<div class="timeline"></div>';
        events.forEach((event, index) => {
            const timelineItem = document.createElement('div');
            timelineItem.classList.add('timeline-item');
            timelineItem.classList.add(index % 2 === 0 ? 'left' : 'right');
            timelineItem.setAttribute('draggable', true);

            let htmlContent = `
                <h3>${event.year} - ${event.date}</h3>
                <p>地点: ${event.location}</p>
            `;

            if (event.remarks) {
                htmlContent += `<p>备注: ${event.remarks}</p>`;
            }

            const bandImgURL = URL.createObjectURL(event.bandPhoto);
            const liveImgURL = URL.createObjectURL(event.livePhoto);
            htmlContent += `<img src="${bandImgURL}" alt="乐队照片">`;
            htmlContent += `<img src="${liveImgURL}" alt="现场照片">`;

            if (event.video) {
                const videoURL = URL.createObjectURL(event.video);
                htmlContent += `<video controls src="${videoURL}"></video>`;
            }

            // 添加编辑和删除按钮
            htmlContent += `
                <button class="edit-btn" onclick="editEvent(${event.id})">编辑</button>
                <button class="delete-btn" onclick="deleteEvent(${event.id})">删除</button>
            `;

            timelineItem.innerHTML = htmlContent;
            timelineContainer.appendChild(timelineItem);
        });

        displayYears(events);
    };
}

function displayYears(events) {
    const timelineContainer = document.querySelector('.timeline-container');
    const years = [...new Set(events.map(event => event.year))]; // 提取所有年份并去重
    years.forEach(year => {
        const yearMarker = document.createElement('div');
        yearMarker.classList.add('timeline-year');
        yearMarker.textContent = year;
        timelineContainer.appendChild(yearMarker);
    });
}

function deleteEvent(id) {
    const transaction = db.transaction(['events'], 'readwrite');
    const objectStore = transaction.objectStore('events');
    objectStore.delete(id);

    transaction.oncomplete = function () {
        displayEvents();
    };
}

function editEvent(id) {
    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.get(id);

    request.onsuccess = function () {
        const event = request.result;
        document.getElementById('year').value = event.year;
        document.getElementById('date').value = event.date;
        document.getElementById('location').value = event.location;
        document.getElementById('remarks').value = event.remarks;

        // 更新提交按钮为“更新”状态
        const form = document.getElementById('eventForm');
        form.onsubmit = function (e) {
            e.preventDefault();
            updateEvent(id);
        };
    };
}

function updateEvent(id) {
    const year = document.getElementById('year').value;
    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const remarks = document.getElementById('remarks').value;

    const transaction = db.transaction(['events'], 'readwrite');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.get(id);

    request.onsuccess = function () {
        const event = request.result;
        event.year = year;
        event.date = date;
        event.location = location;
        event.remarks = remarks;

        objectStore.put(event);

        transaction.oncomplete = function () {
            displayEvents();
            document.getElementById('eventForm').reset();
        };
    };
}

// 生成统计数据
function generateStatistics() {
    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.getAll();

    request.onsuccess = function () {
        const events = request.result;

        const yearStats = {};
        const cityStats = {};
        const livehouseStats = {};
        const monthStats = {};

        events.forEach(event => {
            // 统计年份
            if (yearStats[event.year]) {
                yearStats[event.year]++;
            } else {
                yearStats[event.year] = 1;
            }

            // 统计城市
            const city = event.location.split(' ')[0]; // 解析地点中的城市部分
            if (cityStats[city]) {
                cityStats[city]++;
            } else {
                cityStats[city] = 1;
            }

            // 统计月份
            const month = event.date.split('-')[1];
            if (monthStats[month]) {
                monthStats[month]++;
            } else {
                monthStats[month] = 1;
            }

            // 统计livehouse
            const livehouse = event.location.split(' ')[1]; // 解析地点中的livehouse部分
            if (livehouseStats[livehouse]) {
                livehouseStats[livehouse]++;
            } else {
                livehouseStats[livehouse] = 1;
            }
        });

        // 在页面上展示统计结果
        const output = document.getElementById('stats-output');
        output.innerHTML = `
            <p>年份统计: ${JSON.stringify(yearStats)}</p>
            <p>城市统计: ${JSON.stringify(cityStats)}</p>
            <p>月份统计: ${JSON.stringify(monthStats)}</p>
            <p>Livehouse 统计: ${JSON.stringify(livehouseStats)}</p>
        `;
    };
}
