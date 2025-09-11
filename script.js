const IMGBB_API_KEY = '926c0c94357c2c2ec29ee002ff4a5a91'; 

// --- DOM Elements ---
const elements = {};
const elementIds = [
    'sceneDescriptionEnglish', 'aspectRatio', 'artDirection', 'mood', 'postprocess', 'seed',
    'crefUrl', 'srefUrl', 'crefWeight', 'srefWeight', 'role', 'gender', 'age',
    'wardrobe', 'accessories', 'backdrop', 'lens', 'shotType', 'angle',
    'composition', 'lightDirection',
    'stylize'
];
elementIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) elements[id] = el;
});

const sceneVnInput = document.getElementById('sceneDescriptionVietnamese');
let translationTimeout;

// --- Core Functions ---
function getValues() {
    const values = {};
    for (const id in elements) {
        if (elements[id]) values[id] = elements[id].value.trim();
    }
    return values;
}

function generatePrompt() {
    const v = getValues();
    if (!sceneVnInput.value.trim()) {
         document.getElementById('promptOutput').textContent = "Vui lòng nhập mô tả cảnh bằng Tiếng Việt...";
         return;
    };
    
    const englishDescription = v.sceneDescriptionEnglish || sceneVnInput.value.trim();

    const finalEmotion = document.getElementById('emotionCustomEnglish').value.trim();
    const finalPose = document.getElementById('poseCustomEnglish').value.trim();
    const finalWardrobe = document.getElementById('wardrobeCustomEnglish').value.trim() || v.wardrobe;
    const finalAccessories = document.getElementById('accessoriesCustomEnglish').value.trim() || v.accessories;
    const finalBackdrop = document.getElementById('backdropCustomEnglish').value.trim() || v.backdrop;

    // 1. Core Scene
    let prompt = `cinematic film still of ${englishDescription}, a ${v.age} ${v.gender} ${v.role}. `;
    
    if (finalPose) prompt += `The character is ${finalPose}`;
    if (finalEmotion) {
        if(finalPose) prompt += `, expressing a feeling of ${finalEmotion}. `;
        else prompt += `The character is expressing a feeling of ${finalEmotion}. `;
    } else if (finalPose) {
        prompt += `. `;
    }
    
    if (finalWardrobe) {
        prompt += `They are wearing ${finalWardrobe}`;
        if (finalAccessories && finalAccessories !== 'no accessories') {
            prompt += ` and carrying ${finalAccessories}. `;
        } else {
            prompt += `. `;
        }
    } else if (finalAccessories && finalAccessories !== 'no accessories') {
        prompt += `They are carrying ${finalAccessories}. `;
    }

    prompt += `The scene is set ${finalBackdrop}, ancient India 2500 years ago. `;
    prompt += `Shot on a cinematic camera with a ${v.lens} lens. It's a ${v.shotType} from an ${v.angle}, using a ${v.composition}. `;
    prompt += `The overall art direction is ${v.artDirection} with a ${v.mood} mood. `;
    prompt += `Lighting is defined by ${v.lightDirection}. Post-processing includes ${v.postprocess}. `;

    // 4. Technical Parameters
    let technicals = `${v.aspectRatio}`;
    if (v.crefUrl) {
        technicals += ` --cref ${v.crefUrl}`;
        if (v.crefWeight !== '100') {
            technicals += ` --cw ${v.crefWeight}`;
        }
    }
    if (v.srefUrl) technicals += ` --sref ${v.srefUrl} --sw ${v.srefWeight}`;
    if (v.seed) technicals += ` --seed ${v.seed}`;
    
    technicals += ` --style raw --stylize ${v.stylize} --quality 1`;
    
    document.getElementById('promptOutput').textContent = `${prompt}${technicals}`;
}

function copyPrompt() {
    const promptText = document.getElementById('promptOutput').textContent;
    navigator.clipboard.writeText(promptText).then(() => {
        const message = document.getElementById('copyMessage');
        message.classList.remove('hidden');
        setTimeout(() => message.classList.add('hidden'), 2000);
    });
}

// --- Image Handling ---
async function uploadImage(type) {
    if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY' || !IMGBB_API_KEY) {
        alert('Lỗi: Vui lòng cung cấp ImgBB API Key trong code JavaScript.');
        return;
    }
    const fileInput = document.getElementById(`${type}File`);
    const statusDiv = document.getElementById(`${type}Status`);
    const urlInput = document.getElementById(`${type}Url`);
    if (!fileInput.files[0]) return;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);
    statusDiv.textContent = 'Đang upload...';
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST', body: formData,
        });
        const data = await response.json();
        if (data.success) {
            urlInput.value = data.data.url;
            statusDiv.textContent = '✅ Upload thành công!';
            updateThumbnail(type);
            generatePrompt();
        } else { throw new Error(data.error.message || 'Unknown error'); }
    } catch (error) {
        statusDiv.textContent = `❌ Lỗi upload: ${error.message}`;
    } finally {
        fileInput.value = '';
    }
}

function updateThumbnail(type) {
    const urlInput = document.getElementById(`${type}Url`);
    const thumbnail = document.getElementById(`${type}Thumbnail`);
    if (urlInput.value && urlInput.value.startsWith('http')) {
        thumbnail.src = urlInput.value;
        thumbnail.style.display = 'block';
    } else {
        thumbnail.style.display = 'none';
    }
}

// --- Reference Management (LocalStorage) ---
function getSavedReferences(type) {
    return JSON.parse(localStorage.getItem(`saved_${type}_urls`)) || [];
}
function saveReference(type) {
    const urlInput = document.getElementById(`${type}Url`);
    const url = urlInput.value;
    if (!url || !url.startsWith('http')) {
        alert("Vui lòng nhập một URL hợp lệ.");
        return;
    }
    let savedUrls = getSavedReferences(type);
    if (!savedUrls.includes(url)) {
        savedUrls.push(url);
        localStorage.setItem(`saved_${type}_urls`, JSON.stringify(savedUrls));
        renderSavedThumbnails(type);
    } else {
        alert("Ảnh này đã được lưu.");
    }
}
function deleteReference(type, urlToDelete) {
    let savedUrls = getSavedReferences(type);
    savedUrls = savedUrls.filter(url => url !== urlToDelete);
    localStorage.setItem(`saved_${type}_urls`, JSON.stringify(savedUrls));
    renderSavedThumbnails(type);
}
function useReference(type, url) {
    const urlInput = document.getElementById(`${type}Url`);
    urlInput.value = url;
    updateThumbnail(type);
    generatePrompt();
}
function renderSavedThumbnails(type) {
    const container = document.getElementById(`saved${type.charAt(0).toUpperCase() + type.slice(1)}`);
    container.innerHTML = '';
    const savedUrls = getSavedReferences(type);
    savedUrls.forEach(url => {
        const wrapper = document.createElement('div');
        wrapper.className = 'saved-thumb-wrapper';
        const img = document.createElement('img');
        img.src = url;
        img.className = 'saved-thumb';
        img.onclick = () => useReference(type, url);
        const delBtn = document.createElement('div');
        delBtn.className = 'delete-thumb';
        delBtn.innerHTML = '&times;';
        delBtn.onclick = (e) => {
            e.stopPropagation(); 
            deleteReference(type, url);
        };
        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        container.appendChild(wrapper);
    });
}

// --- Translation ---
async function translateText(vietnameseText) {
    if (!vietnameseText) return "";
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(vietnameseText)}&langpair=vi|en`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Lỗi mạng: ${response.status}`);
        const data = await response.json();
        if (data.responseData) return data.responseData.translatedText;
        return vietnameseText;
    } catch (error) {
        console.error("Lỗi dịch thuật:", error);
        return vietnameseText;
    }
}

async function handleMainTranslation() {
    const vietnameseText = sceneVnInput.value.trim();
    const englishInput = document.getElementById('sceneDescriptionEnglish');
    if (!vietnameseText) {
        englishInput.value = "";
        generatePrompt();
        return;
    }
    englishInput.placeholder = "Đang dịch...";
    const englishText = await translateText(vietnameseText);
    englishInput.value = englishText;
    englishInput.placeholder = "Bản dịch tiếng Anh sẽ xuất hiện ở đây...";
    generatePrompt();
}

// --- Event Listeners & Initialization ---
function setupEventListeners() {
    document.querySelector('.form-section').addEventListener('change', generatePrompt);
    document.querySelector('.form-section').addEventListener('input', (event) => {
        const targetId = event.target.id;
        if (event.target.type !== 'file' && !targetId.includes('Vietnamese') && !targetId.includes('Custom')) {
            generatePrompt();
        }
    });

    ['cref', 'sref'].forEach(type => {
        const slider = document.getElementById(`${type}Weight`);
        const display = document.getElementById(`${type}WeightValue`);
        slider.addEventListener('input', () => { display.textContent = slider.value; });
        document.getElementById(`${type}Url`).addEventListener('input', () => updateThumbnail(type));
    });

    const stylizeSlider = document.getElementById('stylize');
    const stylizeDisplay = document.getElementById('stylizeValue');
    stylizeSlider.addEventListener('input', () => { stylizeDisplay.textContent = stylizeSlider.value; });
    
    sceneVnInput.addEventListener('input', () => {
        clearTimeout(translationTimeout);
        translationTimeout = setTimeout(handleMainTranslation, 600);
    });

    const customTranslationFields = {
        'emotionCustom': 'emotionCustomEnglish', 
        'poseCustom': 'poseCustomEnglish',
        'wardrobeCustom': 'wardrobeCustomEnglish', 
        'accessoriesCustom': 'accessoriesCustomEnglish',
        'backdropCustom': 'backdropCustomEnglish'
    };

    for (const [viId, enId] of Object.entries(customTranslationFields)) {
        let customTimeout;
        document.getElementById(viId).addEventListener('input', (e) => {
            clearTimeout(customTimeout);
            customTimeout = setTimeout(async () => {
                const viText = e.target.value.trim();
                const enInput = document.getElementById(enId);
                if (viText) {
                    enInput.value = await translateText(viText);
                } else {
                    enInput.value = '';
                }
                generatePrompt();
            }, 600);
        });
    }
}

// --- NEW --- Function to populate dropdowns from JSON
function populateDropdown(selectId, options, isSelected) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    
    selectElement.innerHTML = '';
    options.forEach((option, index) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        // Select the first item by default for most dropdowns
        if (isSelected && index === 0) {
            optionElement.selected = true;
        }
        selectElement.appendChild(optionElement);
    });
}

// --- NEW --- Main function to start the application
async function initializeApp() {
    try {
        const response = await fetch('settings.json');
        if (!response.ok) {
            throw new Error('Không thể tải file settings.json!');
        }
        const config = await response.json();

        // Populate all dropdowns
        populateDropdown('mood', config.mood, true);
        populateDropdown('postprocess', config.postprocess, true);
        populateDropdown('role', config.role, true);
        populateDropdown('gender', config.gender, true);
        populateDropdown('age', config.age, false); // select the 2nd one manually
        document.getElementById('age').selectedIndex = 1;
        populateDropdown('wardrobe', config.wardrobe, false);
        populateDropdown('accessories', config.accessories, false);
        populateDropdown('backdrop', config.backdrop, false);
        populateDropdown('lens', config.lens, true);
        populateDropdown('shotType', config.shotType, true);
        populateDropdown('angle', config.angle, true);
        populateDropdown('composition', config.composition, true);
        populateDropdown('lightDirection', config.lightDirection, true);

        // Run other setup tasks
        sceneVnInput.value = "";
        handleMainTranslation().then(generatePrompt);
        renderSavedThumbnails('cref');
        renderSavedThumbnails('sref');
        setupEventListeners();

    } catch (error) {
        console.error("Lỗi khởi tạo ứng dụng:", error);
        document.body.innerHTML = `<p style="color: red; text-align: center; margin-top: 50px;">Lỗi: ${error.message}. Vui lòng kiểm tra lại file settings.json và console.</p>`;
    }
}

// --- Run when the page loads ---
window.onload = initializeApp;