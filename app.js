// Import API service
import { 
  login, register, getProfile, 
  createTitle, getTitles, getTitle, updateTitle, deleteTitle,
  uploadReference, getReferences, getGlobalReferences, deleteReference,
  generateThumbnails, getThumbnails, getThumbnailsBatch
} from './frontend/apiService.js';

// Simulated Server API
const ServerAPI = {
    // Simulated server data storage (In a real app, this would be on the server)
    _data: {
        titles: [],
        globalReferences: []
    },
    
    // Get data from server
    async getTitles() {
        // Simulate network delay
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([...this._data.titles]);
            }, 300);
        });
    },
    
    async getGlobalReferences() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([...this._data.globalReferences]);
            }, 300);
        });
    },
    
    // Save data to server
    async saveTitles(titles) {
        return new Promise(resolve => {
            setTimeout(() => {
                this._data.titles = [...titles];
                resolve({ success: true });
            }, 300);
        });
    },
    
    async saveGlobalReferences(references) {
        return new Promise(resolve => {
            setTimeout(() => {
                this._data.globalReferences = [...references];
                resolve({ success: true });
            }, 300);
        });
    },
    
    // Get a specific title by id
    async getTitleById(id) {
        return new Promise(resolve => {
            setTimeout(() => {
                const title = this._data.titles.find(t => t.id === id);
                resolve(title || null);
            }, 200);
        });
    },
    
    // Generate thumbnails (simulate AI processing)
    async generateThumbnails(titleObj, references, quantity, startIndex = 0) {
        // First generate all concepts sequentially
        const concepts = [];
        
        return new Promise(resolve => {
            // Generate concepts sequentially first - this is the first AI's job
            const generateConcepts = async () => {
                for (let i = 0; i < quantity; i++) {
                    // Simulate concept generation for each thumbnail
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const concept = {
                        id: generateID(),
                        index: startIndex + i,
                        title: titleObj.title,
                        instructions: titleObj.instructions,
                        summary: generatePromptSummary(titleObj.title, titleObj.instructions),
                        fullPrompt: generateFullPrompt(titleObj.title, titleObj.instructions, startIndex + i)
                    };
                    
                    concepts.push(concept);
                }
                
                // After all concepts are generated, start parallel image generation
                processThumbnailsInParallel(concepts, references);
            };
            
            // Process thumbnails in parallel, 5 at a time
            const processThumbnailsInParallel = async (concepts, references) => {
                const thumbnails = [];
                const maxConcurrent = 5;
                let completedCount = 0;
                let activeCount = 0;
                let nextIndex = 0;
                
                // Function to process a single thumbnail
                const processThumbnail = async (concept) => {
                    activeCount++;
                    
                    // Simulate varying processing times (1-3 seconds)
                    const processingTime = 1000 + Math.random() * 2000;
                    await new Promise(resolve => setTimeout(resolve, processingTime));
                    
                    const thumbnailData = {
                        id: concept.id,
                        image_url: `https://placehold.co/600x400/3498db/ffffff?text=Thumbnail+${concept.index + 1}`,
                        summary: concept.summary,
                        promptDetails: {
                            summary: concept.summary,
                            title: concept.title,
                            instructions: concept.instructions || 'No custom instructions provided',
                            referenceCount: references.length,
                            referenceImages: references.map(ref => ref.data),
                            fullPrompt: concept.fullPrompt
                        },
                        status: 'completed',
                        index: concept.index
                    };
                    
                    thumbnails.push(thumbnailData);
                    completedCount++;
                    activeCount--;
                    
                    // Signal that this thumbnail is ready
                    if (thumbnailReady) {
                        thumbnailReady(thumbnailData);
                    }
                    
                    // Start another one if there are more to process
                    if (nextIndex < concepts.length) {
                        processThumbnail(concepts[nextIndex++]);
                    }
                    
                    // If all thumbnails are complete, resolve the main promise
                    if (completedCount === concepts.length) {
                        // Sort thumbnails by original index
                        thumbnails.sort((a, b) => a.index - b.index);
                        resolve(thumbnails);
                    }
                };
                
                // Start initial batch of thumbnails
                const initialBatch = Math.min(maxConcurrent, concepts.length);
                for (let i = 0; i < initialBatch; i++) {
                    processThumbnail(concepts[nextIndex++]);
                }
            };
            
            // Start the process
            generateConcepts();
        });
    },
    
    // Regenerate a single thumbnail
    async regenerateThumbnail(titleObj, references, index) {
        return new Promise(resolve => {
            setTimeout(() => {
                const summaryText = generatePromptSummary(titleObj.title, titleObj.instructions);
                
                const thumbnailData = {
                    id: generateID(),
                    image_url: `https://placehold.co/600x400/e74c3c/ffffff?text=Regenerated+${index+1}`,
                    summary: `Regenerated concept ${index+1} for "${titleObj.title}"`,
                    promptDetails: {
                        summary: summaryText,
                        title: titleObj.title,
                        instructions: titleObj.instructions || 'No custom instructions provided',
                        referenceCount: references.length,
                        referenceImages: references.map(ref => ref.data),
                        fullPrompt: generateFullPrompt(titleObj.title, titleObj.instructions, index)
                    }
                };
                
                resolve(thumbnailData);
            }, 2000);
        });
    }
};

// Data Storage (will now communicate with the backend)
let titles = [];
let globalReferences = [];
let currentTitle = null;
let currentReferenceDataMap = {}; // New: To store reference image data for the current view
let isLoading = true;
let currentUser = null;

// DOM Elements
const titleList = document.getElementById('title-list');
const titleInput = document.getElementById('title-input');
const customInstructions = document.getElementById('custom-instructions');
const quantitySelect = document.getElementById('quantity-select');
const generateBtn = document.getElementById('generate-btn');
const moreThumbnailsBtn = document.getElementById('more-thumbnails-btn');
const moreThumbnailsSection = document.getElementById('more-thumbnails-section');
const thumbnailsGrid = document.getElementById('thumbnails-grid');
const thumbnailsEmptyState = document.getElementById('thumbnails-empty-state');
const progressSection = document.getElementById('progress-section');
const ai1Progress = document.getElementById('ai1-progress');
const ai2Progress = document.getElementById('ai2-progress');
const ai1Status = document.getElementById('ai1-status');
const ai2Status = document.getElementById('ai2-status');
const newTitleBtn = document.getElementById('new-title-btn');
const globalReferenceToggle = document.getElementById('global-reference-toggle');
const globalReferencesSection = document.getElementById('global-references');
const titleReferencesSection = document.getElementById('title-references');
const globalDropzone = document.getElementById('global-dropzone');
const titleDropzone = document.getElementById('title-dropzone');
const globalFileInput = document.getElementById('global-file-input');
const titleFileInput = document.getElementById('title-file-input');
const globalUploadBtn = document.getElementById('global-upload-btn');
const titleUploadBtn = document.getElementById('title-upload-btn');
const globalReferenceImages = document.getElementById('global-reference-images');
const titleReferenceImages = document.getElementById('title-reference-images');
const promptModal = document.getElementById('prompt-modal');
const closeModal = document.querySelector('.close-modal');
const modalImage = document.getElementById('modal-image');
const promptSummary = document.getElementById('prompt-summary');
const promptTitle = document.getElementById('prompt-title');
const promptInstructions = document.getElementById('prompt-instructions');
const referenceCount = document.getElementById('reference-count');
const referenceThumbnails = document.getElementById('reference-thumbnails');
const fullPrompt = document.getElementById('full-prompt');
const loadingOverlay = document.getElementById('loading-overlay');

// Callback to handle when a thumbnail is ready
let thumbnailReady = null;

// Initialize the application
async function init() {
    // console.log("Initializing app...");
    showLoading(true);
    
    // Set up event listeners first, so they're connected regardless of auth state
    setupEventListeners();
    
    try {
        // Check if user is logged in (token exists)
        const token = localStorage.getItem('token');
        if (token) {
            showApp();
            console.log("Token found, getting user profile...");
            // Get user profile
            const response = await getProfile();
            currentUser = response.data.user;
            
            // Set username in the UI
            document.getElementById('username-display').textContent =  "@"+currentUser.username;
            
            // Load data
            await loadUserData();
        } else {
            console.log("No token found, showing login form...");
            // Show login form
            showLoginForm();
        }
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // If token is invalid, show login form
        localStorage.removeItem('token');
        showLoginForm();
    } finally {
        showLoading(false);
    }
}

// Show/hide loading indicator
function showLoading(show) {
    // console.log("Loading indicator:", show ? "SHOWING" : "HIDING");
    isLoading = show;
    
    // Show/hide the loading overlay
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    } else {
        console.error("Loading overlay element not found!");
    }
    
    // Disable buttons while loading
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = show;
    });
}

// Load user data from server
async function loadUserData() {
    try {
        // Fetch titles
        console.log('LUD: Fetching titles...');
        const titlesResponse = await getTitles();
        titles = titlesResponse.data.titles;
        console.log('LUD: Titles fetched:', titles ? titles.length : 0);
        
        // Fetch global references
        console.log('LUD: Fetching global references...');
        const referencesResponse = await getGlobalReferences();
        console.log('LUD: Global references API response:', referencesResponse);
        globalReferences = referencesResponse.data.references;
        console.log('LUD: Stored global references:', globalReferences);
        
        // Render UI
        console.log('LUD: Rendering titles list...');
        renderTitlesList();
        // right after renderTitlesList();
        const lastId = localStorage.getItem('lastTitleId');
        // alert(lastId);
            if (lastId) {
                const elem = document.querySelector(`.title-item[data-id="${lastId}"]`);
                if (elem) {
                elem.click();
                //   return;
                }
            }

        console.log('LUD: Rendering global reference images...');
        renderReferenceImages(globalReferences, globalReferenceImages);
        console.log('LUD: Global reference images rendered.');
        
        // Show main app container and hide login/register forms
        // document.getElementById('login-container').style.display = 'none';
        // document.getElementById('app-container').style.display = 'flex';

        // If titles are loaded, start polling for the first one for demonstration
        if (titles && titles.length > 0) {
            const firstTitleId = titles[0].id;
            const defaultQuantity = 5;
            const existingCount   = 0;
            console.log(`LUD: Automatically starting polling for title ID: ${firstTitleId}, quantity: ${defaultQuantity}`);
            // pollThumbnailStatus(firstTitleId, defaultQuantity, existingCount);
        } else {
            console.log('LUD: No titles found, not starting auto-polling.');
        }
        console.log('LUD: User data loading complete.');
    } catch (error) {
        console.error('Error loading user data (LUD):', error);
        if (error.response) {
            console.error('LUD: Server error response:', error.response.status, error.response.data);
        }
        alert('Failed to load data. Please try again.');
    }
}

// Show login form
function showLoginForm() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await login(email, password);
        localStorage.setItem('token', response.data.token);
        currentUser = response.data.user;
        await loadUserData();
        showApp();
    } catch (error) {
        console.error('Login error:', error);
        alert(error.response?.data?.error || 'Login failed. Please try again.');
    }
}

// Handle register
async function handleRegister(event) {
    event.preventDefault();
    console.log("Register form submitted");
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!username || !email || !password) {
        alert("Please fill in all fields");
        return;
    }
    
    try {
        showLoading(true);
        console.log("Sending register request...", { username, email });
        const response = await register(username, email, password);
        console.log("Register response:", response.data);
        localStorage.setItem('token', response.data.token);
        currentUser = response.data.user;
        
        // Set username in the UI
        showApp();
        document.getElementById('username-display').textContent = "@"+currentUser.username;
        await loadUserData();
    } catch (error) {
        console.error('Registration error:', error);
        if (error.response && error.response.data) {
            alert(error.response.data.error || 'Registration failed. Please try again.');
        } else {
            alert('Registration failed. Please check your network connection and try again.');
        }
    } finally {
        showLoading(false);
    }
}
function showApp() {
    // hide any login/register screens
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
  }
// Logout function
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    titles = [];
    globalReferences = [];
    currentTitle = null;
    showLoginForm();
}

// Event Listeners
function setupEventListeners() {
    // console.log("Setting up event listeners...");
    
    // New Title Button
    newTitleBtn.addEventListener('click', () => {
        clearMainContent();
        titleInput.focus();
    });
    
    // Generate Button
    generateBtn.addEventListener('click', async () => {

        // const resp = await getThumbnailsBatch(7, 5, 5);
        // console.log("***resp", resp);
        // return;
        const title = titleInput.value.trim();
        const existingCount = currentTitle?.thumbnails?.length || 0;
        // console.log(currentTitle);
        // return;
        if (!title) {
            alert('Please enter a title');
            return;
        }
        
        try {
            const instructions = customInstructions.value.trim();
            const quantity = parseInt(quantitySelect.value) || 5;
           
            // Show loading cards (without clearing existing ones)
            // showLoadingCards(quantity, existingCount);
            
            // console.log("Creating/updating title:", { title, instructions });
            
            // Check if this is a new title or existing one
            if (!currentTitle || currentTitle.title !== title) {
                // Create new title
                // console.log("Creating new title");
                const response = await createTitle(title, instructions);
                // console.log("Title created:", response.data);
                currentTitle = response.data;
            } else {
                // Update existing title
                // console.log("Updating existing title:", currentTitle.id);
                const response = await updateTitle(currentTitle.id, title, instructions);
                // console.log("Title updated:", response.data);
                currentTitle = response.data;
            }
            
            // Upload any new title-specific references
            if (!globalReferenceToggle.checked && currentTitle.references) {
                console.log("Processing title-specific references");
                for (const ref of currentTitle.references) {
                    if (!ref.id) { // New reference that hasn't been uploaded
                        console.log("Uploading new reference");
                        await uploadReference(currentTitle.id, ref.data, false);
                    }
                }
            }
            
            const startIndex     = existingCount;
            const batchId    = `batch-${Date.now()}`;
            
            showBatchLoadingCards(quantity, startIndex, batchId);
            // Generate thumbnails
            console.log("Generating thumbnails for title ID:", currentTitle.id, "Quantity:", quantity);
        //   const generateResponse = await generateThumbnails(currentTitle.id, quantity);
        
        const genPromise =  generateThumbnails(currentTitle.id, quantity);
        pollBatchStatus(currentTitle.id, startIndex, quantity, batchId);
        genPromise.catch(err => console.error("Generation error", err));
        // …optionally await or catch errors later
        // genPromise
        // .then(resp => console.log('Gen finished:', resp))
        // .catch(err  => console.error('Gen error:', err));

            // await generateThumbnails(currentTitle.id, currentTitle.references, quantity, startIndex);
            // console.log("Generate thumbnails response:", generateResponse.data);
            
            // Start polling for thumbnail status instead of loading immediately
            // pollThumbnailStatus(currentTitle.id, quantity, existingCount);
            //    pollBatchStatusMock(startIndex, quantity, batchId);
            // Refresh titles list after starting generation/polling
            console.log("Refreshing titles list");
            const titlesResponse = await getTitles();
            titles = titlesResponse.data.titles;
            renderTitlesList();
            
            // No longer call loadThumbnails here immediately
            // console.log("Loading thumbnails");
            // await loadThumbnails(currentTitle.id);
            } catch (error) {
            console.error('Error generating thumbnails:', error);
            showLoading(false);
            
            // More detailed error information
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error("Server responded with error:", error.response.status);
                console.error("Error data:", error.response.data);
                alert(`Server error (${error.response.status}): ${error.response.data?.error || 'Unknown error'}`);
            } else if (error.request) {
                // The request was made but no response was received
                // console.error("No response received:", error.request);
                // alert('No response from server. Please check if the backend is running.');
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error("Request setup error:", error.message);
                alert(`Error: ${error.message}`);
            }
        }
    });
    
    // More Thumbnails Button
    moreThumbnailsBtn.addEventListener('click', async () => {
        if (!currentTitle) return;
        
        showLoading(true);
        
        try {
            const quantity = parseInt(quantitySelect.value) || 3;
            
            // Generate more thumbnails
            await generateThumbnails(currentTitle.id, quantity);
            
            
            // Get the updated thumbnails
            await loadThumbnails(currentTitle.id);
        } catch (error) {
            console.error('Error generating more thumbnails:', error);
            alert('Failed to generate additional thumbnails. Please try again.');
        } finally {
            showLoading(false);
        }
    });
    
    // Toggle reference type
    globalReferenceToggle.addEventListener('change', () => {
        const useGlobalRefs = globalReferenceToggle.checked;
        globalReferencesSection.style.display = useGlobalRefs ? 'block' : 'none';
        titleReferencesSection.style.display = useGlobalRefs ? 'none' : 'block';
        
        if (!useGlobalRefs && currentTitle) {
            renderReferenceImages(currentTitle.references, titleReferenceImages);
        }
    });
    
    // Global upload button
    globalUploadBtn.addEventListener('click', () => {
        globalFileInput.click();
    });
    
    // Title-specific upload button
    titleUploadBtn.addEventListener('click', () => {
        titleFileInput.click();
    });
    
    // Global file input change
    globalFileInput.addEventListener('change', (e) => {
        handleFileUpload(e, globalReferences, globalReferenceImages, true);
    });
    
    // Title-specific file input change
    titleFileInput.addEventListener('change', (e) => {
        if (!currentTitle) {
            alert('Please enter a title first');
            return;
        }
        handleFileUpload(e, currentTitle.references, titleReferenceImages, false);
    });
    
    // Drag and drop events for dropzones
    setupDragAndDrop(globalDropzone, globalReferences, globalReferenceImages, true);
    setupDragAndDrop(titleDropzone, currentTitle?.references || [], titleReferenceImages, false);
    
    // Modal close button
    closeModal.addEventListener('click', closePromptModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === promptModal) {
            closePromptModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && promptModal.style.display === 'block') {
            closePromptModal();
        }
    });
    
    // Login form submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        // console.log("Login form listener attached");
    } else {
        console.error("Login form not found!");
    }
    
    // Register form toggle
    const showRegisterLink = document.getElementById('show-register');
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = 'block';
            console.log("Switched to register form");
        });
    }
    
    // Login form toggle
    const showLoginLink = document.getElementById('show-login');
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            console.log("Switched to login form");
        });
    }
    
    // Register form submit
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log("Register form listener attached");
    } else {
        console.error("Register form not found!");
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Setup drag and drop functionality
function setupDragAndDrop(dropzone, referencesArray, displayElement, isGlobal) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        }, false);
    });
    
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (!isGlobal && !currentTitle) {
            alert('Please enter a title first');
            return;
        }
        
        handleFiles(files, referencesArray, displayElement, isGlobal);
    }, false);
}

// Handle file uploads from input or drag-and-drop
function handleFileUpload(event, referencesArray, displayElement, isGlobal) {
    const files = event.target.files;
    handleFiles(files, referencesArray, displayElement, isGlobal);
    event.target.value = ''; // Reset the input
}

// Process uploaded files
async function handleFiles(files, referencesArray, displayElement, isGlobal) {
    if (!files.length) return;
    
    for (const file of files) {
        if (!file.type.match('image.*')) {
            alert('Please upload only image files');
            continue;
        }
        
        try {
            // Read file as data URL
            const imageData = await readFileAsDataURL(file);
            
            if (isGlobal) {
                // Upload global reference to server
                const response = await uploadReference(null, imageData, true);
                globalReferences.push({
                    id: response.data.id,
                    data: imageData
                });
            } else {
                if (!currentTitle.references) {
                    currentTitle.references = [];
                }
                
                if (currentTitle.id) {
                    // Upload title-specific reference to server
                    const response = await uploadReference(currentTitle.id, imageData, false);
                    currentTitle.references.push({
                        id: response.data.id,
                        data: imageData
                    });
                } else {
                    // Store locally until title is created
                    currentTitle.references.push({
                        data: imageData
                    });
                }
            }
            
            renderReferenceImages(isGlobal ? globalReferences : currentTitle.references, displayElement);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Failed to process reference image. Please try again.');
        }
    }
}

// Promise-based file reader
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

// Render reference images
function renderReferenceImages(references, container) {
    container.innerHTML = '';
    
    if (!references || !Array.isArray(references) || references.length === 0) {
        container.innerHTML = '<p class="empty-state">No reference images uploaded</p>';
        return;
    }
    
    references.forEach(ref => {
        // Use ref.image_data if ref.data is not present (for data loaded from backend)
        // Use ref.data if present (for freshly uploaded images not yet saved/reloaded)
        const imageDataString = ref.image_data || ref.data;

        if (!ref || !imageDataString) {
            console.warn('Invalid reference found or missing image data:', ref);
            return; // Skip this reference
        }
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'reference-image';
        
        const img = document.createElement('img');
        img.src = imageDataString;
        img.alt = 'Reference Image';
        img.onerror = () => {
            console.warn('Failed to load reference image:', ref.id);
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%23ccc" d="M21.9 21.9l-8.49-8.49-9.93-9.93L2.1 2.1 .69 3.51 3 5.83V19c0 1.1 .9 2 2 2h13.17l2.31 2.31 1.42-1.41zM5 18l3.5-4.5 2.5 3.01L12.17 15l3 3H5zm16 .17L5.83 3H19c1.1 0 2 .9 2 2v13.17z"/%3E%3C/svg%3E';
            img.alt = 'Broken Image';
        };
        
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-image';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            // Ensure ref.id exists. If it was a freshly added client-side only ref without an ID,
            // this might need a different way to remove it (e.g., by index or object equality).
            if (ref.id) {
                removeReferenceImage(ref.id, references, container);
            } else {
                // Fallback for locally added items without an ID yet (if any)
                const indexToRemove = references.indexOf(ref);
                if (indexToRemove > -1) {
                    references.splice(indexToRemove, 1);
                    renderReferenceImages(references, container); // Re-render
                }
                console.warn('Attempted to remove reference without an ID', ref);
            }
        });
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(removeBtn);
        container.appendChild(imgContainer);
    });
}

// Remove a reference image
async function removeReferenceImage(id, references, container) {
    try {
        // Delete from server
        await deleteReference(id);
        
        // Remove from local array
        const index = references.findIndex(ref => ref.id === id);
        if (index !== -1) {
            references.splice(index, 1);
            renderReferenceImages(references, container);
        }
    } catch (error) {
        console.error('Error removing reference image:', error);
        alert('Failed to delete reference image. Please try again.');
    }
}

function cardLoader(index) {
    const card = document.createElement('div');
    card.className = 'thumbnail-item loading loader-card';
    card.id = `thumb-loader-${index}`;
  
    card.innerHTML = `
     <div class="thumbnail-centered-loader ">
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>  
<svg xmlns="http://www.w3.org/2000/svg" style="fill: #3498db" viewBox="0 0 24 24" width="28" height="28">
  <path d="M10.985 7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm.6 7.05 3.49-5.59c.41-.65 1.36-.62 1.73.05l4.88 9.01c.36.67-.12 1.48-.88 1.48H3.195a.99.99 0 0 1-.86-1.49l3.08-5.48a1 1 0 0 1 1.5-.29l3.2 2.56c.46.37 1.15.26 1.47-.25z"/>
</svg>
      </div>
    </div>
    `;
    let pct = 0;
    const interval = setInterval(() => {
      if (pct >= 90) return; // stop at 90%, real updates will take over
      pct += Math.floor(Math.random() * 5 + 1); // increase 1–5%
      const number = card.querySelector('.progress-number');
      const fill = card.querySelector('.progress-fill');
      if (number) number.textContent = `${Math.min(pct, 90)}%`;
      if (fill) fill.style.width = `${Math.min(pct, 90)}%`;
    }, 400);
    card.dataset.timerId = interval;
    // Start a timer for this card
    // let seconds = 0;
    // const timer = setInterval(() => {
    //     seconds++;
    //     const progressNumber = card.querySelector('.progress-number');
    //     if (progressNumber) {
    //         progressNumber.textContent = `${seconds}%`;
    //     }
    // }, 1000);

    // Store the timer ID on the card element so we can clear it later
    // card.dataset.timerId = timer;

    return card;
}

// Function to show loading cards in the grid
// function showLoadingCards(quantity, startIndex = 0) {
//     // insert new cards at the front, but give them IDs thumb-loader-(startIndex + i)
//     for (let i = 0; i < quantity; i++) {
//       const idx = startIndex + i;
//       const loadingCard = cardLoader(idx);
//       thumbnailsGrid.insertBefore(loadingCard, thumbnailsGrid.firstChild);
//     }
//   }

function showBatchLoadingCards(qty, startIndex, batchId) {
     for (let i = 0; i < qty; i++) {
       const idx = startIndex + i;
    
       // 1a) Create the same wrapper that renderThumbnail expects
       const wrapper = document.createElement('div');
       wrapper.id = `thumb-${idx}`;
       wrapper.dataset.batchId = batchId;
       wrapper.className = 'thumbnail-item loading';
    
       // 1b) Insert your spinner/progress inside it
       const loader = cardLoader(idx);
       wrapper.appendChild(loader);
       // 1c) Prepend so newest are on top
       thumbnailsGrid.insertBefore(wrapper, thumbnailsGrid.firstChild);
     }
   }

// Generate thumbnails using server API
async function generateServerThumbnails(titleObj, references, quantity, isAdditional) {
    // Show progress section
    progressSection.style.display = 'block';
    thumbnailsEmptyState.style.display = 'none';
    
    // Clear existing thumbnails if not generating additional ones
    if (!isAdditional) {
        thumbnailsGrid.innerHTML = '';
        titleObj.thumbnails = [];
    }
    
    // Get the starting index for new thumbnails
    const startIndex = isAdditional ? titleObj.thumbnails.length : 0;
    
    // Setup loading thumbnails
    for (let i = 0; i < quantity; i++) {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumbnail-item';
        thumbContainer.id = `thumb-${startIndex + i}`;
        
        const loadingThumb = document.createElement('div');
        loadingThumb.className = 'loading-thumbnail';
        
        thumbContainer.appendChild(loadingThumb);
        thumbnailsGrid.appendChild(thumbContainer);
    }
    
    // Track completed thumbnails
    const completedThumbnails = [];
    
    // Set up callback for when thumbnails are ready
    thumbnailReady = (thumbnail) => {
        // Render the thumbnail as soon as it's ready
        renderThumbnail(thumbnail, thumbnail.index);
        completedThumbnails.push(thumbnail);
        
        // Update the AI2 status
        ai2Status.textContent = `Creating images... ${completedThumbnails.length}/${quantity} complete`;
        ai2Progress.style.width = `${(completedThumbnails.length / quantity) * 100}%`;
    };
    
    try {
        // Simulate AI 1 (concept generation) - sequential
        ai1Status.textContent = 'Generating thumbnail ideas...';
        simulateProgress(ai1Progress, null, null, 'Thumbnail concepts ready!', 3000, async () => {
            // After AI 1 completes, start AI 2 (image generation) - parallel
            ai2Status.textContent = 'Creating images... 0/' + quantity + ' complete';
            ai2Progress.style.width = '0%';
            
            // Get AI-generated thumbnails from server (now in parallel)
            const newThumbnails = await ServerAPI.generateThumbnails(titleObj, references, quantity, startIndex);
            
            // After all thumbnails are generated
            progressSection.style.display = 'none';
            moreThumbnailsSection.style.display = 'block';
            
            // Save the generated thumbnails
            if (isAdditional) {
                titleObj.thumbnails = [...titleObj.thumbnails, ...newThumbnails];
            } else {
                titleObj.thumbnails = newThumbnails;
            }
            
            await saveData();
            
            // Clear the callback
            thumbnailReady = null;
        });
    } catch (error) {
        console.error('Error generating thumbnails:', error);
        alert('Failed to generate thumbnails. Please try again.');
        progressSection.style.display = 'none';
        thumbnailReady = null;
    }
}

// Generate a summary of the prompt
function generatePromptSummary(title, instructions) {
    if (!instructions || instructions.trim() === '') {
        return `A thumbnail for "${title}" with standard settings`;
    }
    
    // Extract keywords from instructions to create a summary
    const words = instructions.split(' ');
    const keyPhrases = [];
    
    if (words.length <= 5) {
        return `A ${instructions.toLowerCase()} thumbnail for "${title}"`;
    }
    
    // Look for style indicators
    const styleWords = ['style', 'design', 'look', 'aesthetic', 'theme'];
    const colorWords = ['color', 'blue', 'red', 'green', 'yellow', 'dark', 'light', 'bright', 'pastel'];
    
    // Extract style phrases
    for (let i = 0; i < words.length - 1; i++) {
        if (styleWords.includes(words[i].toLowerCase())) {
            keyPhrases.push(`${words[i]} ${words[i+1]}`);
        }
        if (colorWords.includes(words[i].toLowerCase())) {
            keyPhrases.push(words[i]);
        }
    }
    
    if (keyPhrases.length > 0) {
        return `A thumbnail for "${title}" with ${keyPhrases.join(', ')}`;
    }
    
    // Fallback: just take the first few words
    return `A thumbnail for "${title}" with ${instructions.substring(0, 40)}${instructions.length > 40 ? '...' : ''}`;
}

// Generate full prompt for the AI
function generateFullPrompt(title, instructions, index) {
    const basePrompt = `Create a thumbnail image for a content piece titled "${title}".`;
    
    let fullPrompt = basePrompt;
    
    if (instructions && instructions.trim() !== '') {
        fullPrompt += `\nCustom instructions: ${instructions}`;
    }
    
    // Add some variety based on the index
    const variations = [
        'Make it eye-catching and professional.',
        'Ensure it stands out in search results.',
        'Design it to attract the target audience.',
        'Create a visually appealing composition.',
        'Make it modern and trendy.'
    ];
    
    fullPrompt += `\n${variations[index % variations.length]}`;
    
    return fullPrompt;
}

// Render a single thumbnail
function renderThumbnail(thumbnailData, index) {
    const oldCard = document.getElementById(`thumb-loader-${index}`);
    if (oldCard && oldCard.dataset.timerId) {
        // Clear the timer when replacing the loading card
        clearInterval(parseInt(oldCard.dataset.timerId));
    }

    // console.log('Rendering thumbnail data:', thumbnailData);
    const thumbContainer = document.getElementById(`thumb-${index}`);
    thumbContainer.innerHTML = '';
    thumbContainer.dataset.id = thumbnailData.id;
    
    if (thumbnailData.status === 'failed') {
        // Show error state for failed thumbnails
        const errorDiv = document.createElement('div');
        errorDiv.className = 'thumbnail-error';
        
        const errorIcon = document.createElement('div');
        errorIcon.className = 'error-icon';
        errorIcon.innerHTML = '!';
        
        const errorMessage = document.createElement('p');
        errorMessage.className = 'error-message';
        errorMessage.textContent = thumbnailData.error_message || 'Thumbnail generation failed';
        
        errorDiv.appendChild(errorIcon);
        errorDiv.appendChild(errorMessage);
        
        const regenerateBtn = document.createElement('button');
        regenerateBtn.className = 'action-btn';
        regenerateBtn.textContent = 'Try Again';
        regenerateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            regenerateSingleThumbnail(index, thumbnailData.id);
        });
        
        errorDiv.appendChild(regenerateBtn);
        thumbContainer.appendChild(errorDiv);
        return;
    }
    
    // Regular thumbnail rendering for successful thumbnails
    const img = document.createElement('img');
    img.src = thumbnailData.image_url;
    if(thumbnailData.image_url.includes('https://')){
        img.width = 'fit-content';
    }
    img.alt = thumbnailData.summary;
    img.className = 'thumbnail-image';
    
    const actions = document.createElement('div');
    actions.className = 'thumbnail-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'action-btn';
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', (e) => {
        
        e.stopPropagation(); // Prevent opening modal when clicking download
        // In a real app, this would download the image
        // alert(`Downloading: ${thumbnailData.summary}`);
        const link = document.createElement('a');
        link.href = thumbnailData.image_url;
        // Suggest a filename:
        link.download = `thumbnail-${index + 1}.png`;
        // Firefox requires the link to be in the DOM
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    const regenerateBtn = document.createElement('button');
    regenerateBtn.className = 'action-btn';
    regenerateBtn.textContent = 'Regenerate';
    regenerateBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent opening modal when clicking regenerate
        // In a real app, this would regenerate this specific thumbnail
        regenerateSingleThumbnail(index, thumbnailData.id);
    });
    
    actions.appendChild(downloadBtn);
    actions.appendChild(regenerateBtn);
    
    thumbContainer.appendChild(img);
    thumbContainer.appendChild(actions);
    
    // Add click event to view prompt details
    thumbContainer.addEventListener('click', () => {
        showPromptDetails(thumbnailData);
    });
}

// Show prompt details in modal
function showPromptDetails(thumbnailData) {
    // Set modal content
    modalImage.src = thumbnailData.image_url;
    promptSummary.textContent = thumbnailData.summary;
    // Ensure promptDetails and its properties exist, providing fallbacks
    const details = thumbnailData.promptDetails || {};
    promptTitle.textContent = details.title || (currentTitle ? currentTitle.title : 'N/A');
    promptInstructions.textContent = details.instructions || 'No custom instructions provided';
    referenceCount.textContent = details.referenceCount || 0;
    fullPrompt.textContent = details.fullPrompt || '';
    
    // Display reference images
    referenceThumbnails.innerHTML = '';
    if (details.referenceImages && Array.isArray(details.referenceImages) && details.referenceImages.length > 0) {
        details.referenceImages.forEach(refId => {
            const refImgData = currentReferenceDataMap[refId];
            if (refImgData) {
                const imgElement = document.createElement('img');
                imgElement.src = refImgData;
                imgElement.className = 'reference-thumb';
                imgElement.alt = `Reference Image (ID: ${refId})`;
                imgElement.onerror = () => { 
                    console.warn('Failed to load reference thumb from map:', refId); 
                    imgElement.alt = 'Error loading ref'; 
                }; 
                referenceThumbnails.appendChild(imgElement);
            } else {
                console.warn(`Reference ID ${refId} not found in currentReferenceDataMap.`);
            }
        });
        if (referenceThumbnails.children.length === 0) {
             referenceThumbnails.innerHTML = '<p class="empty-state">Reference image data missing.</p>';
        }
    } else {
        referenceThumbnails.innerHTML = '<p class="empty-state">No reference images used</p>';
    }
    
    // Show modal
    promptModal.style.display = 'block';
    
    // Prevent scrolling on background
    document.body.style.overflow = 'hidden';
}

// Regenerate a single thumbnail
async function regenerateSingleThumbnail(index, id) {
    if (!currentTitle) return;
    
    const thumbContainer = document.getElementById(`thumb-${index}`);
    thumbContainer.innerHTML = '';
    
    const loadingThumb = document.createElement('div');
    loadingThumb.className = 'loading-thumbnail';
    thumbContainer.appendChild(loadingThumb);
    
    try {
        // In a real implementation, you would call a specific endpoint to regenerate a single thumbnail
        // For now, we'll just reload all thumbnails after a delay to simulate regeneration
        setTimeout(async () => {
            await loadThumbnails(currentTitle.id);
        }, 2000);
    } catch (error) {
        console.error('Error regenerating thumbnail:', error);
        alert('Failed to regenerate thumbnail. Please try again.');
    }
}

// Simulate progress for the AI processes
function simulateProgress(progressBar, statusElement, startMessage, endMessage, duration, callback) {
    let startTime = Date.now();
    let progress = 0;
    
    if (statusElement && startMessage) {
        statusElement.textContent = startMessage;
    }
    
    const interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        
        if (elapsedTime >= duration) {
            progressBar.style.width = '100%';
            if (statusElement && endMessage) {
                statusElement.textContent = endMessage;
            }
            clearInterval(interval);
            if (callback) callback();
            return;
        }
        
        progress = (elapsedTime / duration) * 100;
        progressBar.style.width = `${progress}%`;
    }, 50);
}

// Render the list of titles in the sidebar
function renderTitlesList() {
    titleList.innerHTML = '';
    
    if (titles.length === 0) {
        titleList.innerHTML = '<div class="empty-state">No titles yet. Create your first one!</div>';
        return;
    }
    
    // Sort titles by timestamp/created_at (newest first)
    titles.sort((a, b) => {
        const timeA = a.timestamp || new Date(a.created_at).getTime();
        const timeB = b.timestamp || new Date(b.created_at).getTime();
        return timeB - timeA;
    });
    
    titles.forEach(title => {
        const titleItem = document.createElement('div');
        titleItem.className = 'title-item';
        titleItem.dataset.id = title.id; // Store ID as data attribute
        
        if (currentTitle && currentTitle.id === title.id) {
            titleItem.classList.add('active');
        }
        
        titleItem.textContent = title.title;
        titleItem.addEventListener('click', () => {
            localStorage.setItem('lastTitleId', title.id);
            loadTitle(title);
        });
        
        titleList.appendChild(titleItem);
    });
}

// Load a title when clicked from the sidebar
async function loadTitle(titleItem) {
    showLoading(true);
    
    try {
        const titleId = titleItem.id;
        console.log(`Starting to load title with ID: ${titleId}`);
        
        // Get the title details
        try {
            const titleResponse = await getTitle(titleId);
            currentTitle = titleResponse.data;
            // console.log(`Successfully loaded title details:`, currentTitle);
        } catch (titleError) {
            console.error(`Error loading title details for ID ${titleId}:`, titleError);
            if (titleError.response) {
                console.error(`Status: ${titleError.response.status}, Data:`, titleError.response.data);
            }
            throw new Error(`Failed to load title details: ${titleError.message}`);
        }
        
        // Get title references
        try {
            const referencesResponse = await getReferences(titleId);
            currentTitle.references = referencesResponse.data.references;
            console.log(`Successfully loaded references:`, currentTitle.references);
        } catch (refError) {
            console.error(`Error loading references for title ID ${titleId}:`, refError);
            if (refError.response) {
                console.error(`Status: ${refError.response.status}, Data:`, refError.response.data);
            }
            throw new Error(`Failed to load title references: ${refError.message}`);
        }
        
        // Load thumbnails
        try {
            const thumbnails = await loadThumbnails(titleId);
            currentTitle.thumbnails = thumbnails;
            // console.log(`Successfully loaded thumbnails:`, thumbnails);
        } catch (thumbnailError) {
            console.error(`Error loading thumbnails for title ID ${titleId}:`, thumbnailError);
            if (thumbnailError.response) {
                console.error(`Status: ${thumbnailError.response.status}, Data:`, thumbnailError.response.data);
            }
            throw new Error(`Failed to load thumbnails: ${thumbnailError.message}`);
        }
        
        // Update the form values
        titleInput.value = currentTitle.title;
        customInstructions.value = currentTitle.instructions || '';
        
        // Update reference images
        if (currentTitle.references && currentTitle.references.length > 0) {
            globalReferenceToggle.checked = false;
            globalReferencesSection.style.display = 'none';
            titleReferencesSection.style.display = 'block';
            renderReferenceImages(currentTitle.references, titleReferenceImages);
        } else {
            globalReferenceToggle.checked = true;
            globalReferencesSection.style.display = 'block';
            titleReferencesSection.style.display = 'none';
        }
        
        // Display thumbnails
        renderSavedThumbnails(currentTitle);
        
        // Update active state in sidebar
        const titleItems = document.querySelectorAll('.title-item');
        titleItems.forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === currentTitle.id) {
                item.classList.add('active');
            }
        });
        
        // Show more thumbnails button if thumbnails exist
        moreThumbnailsSection.style.display = currentTitle.thumbnails && currentTitle.thumbnails.length > 0 ? 'block' : 'none';
    } catch (error) {
        console.error('Error loading title:', error);
        alert(`Failed to load title data: ${error.message}. Please try again.`);
    } finally {
        showLoading(false);
    }
}

// Render saved thumbnails for a title
function renderSavedThumbnails(title) {
    thumbnailsGrid.innerHTML = '';
    
    if (!title || !title.thumbnails || !Array.isArray(title.thumbnails) || title.thumbnails.length === 0) {
        thumbnailsEmptyState.style.display = 'block';
        return;
    }
    
    thumbnailsEmptyState.style.display = 'none';
    
    // Filter out any invalid thumbnails
    const validThumbnails = title.thumbnails.filter(thumbnail => 
        thumbnail && typeof thumbnail === 'object' && thumbnail.id);
    
    if (validThumbnails.length === 0) {
        thumbnailsEmptyState.style.display = 'block';
        return;
    }
    
    validThumbnails.forEach((thumbnail, index) => {
        try {
            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'thumbnail-item';
            thumbContainer.id = `thumb-${index}`;
            if(thumbnail.image_url.includes('uploads/') || thumbnail.status === 'failed'|| thumbnail.image_url===''){
                thumbContainer.classList.add('max-height-fit-content');
            }
            
            thumbnailsGrid.appendChild(thumbContainer);
            
            renderThumbnail(thumbnail, index);
        } catch (error) {
            console.error(`Error rendering thumbnail at index ${index}:`, error);
        }
    });
}

// Clear main content for a new title
function clearMainContent() {
    currentTitle = null;
    titleInput.value = '';
    customInstructions.value = '';
    quantitySelect.value = '5';
    thumbnailsGrid.innerHTML = '';
    thumbnailsEmptyState.style.display = 'block';
    moreThumbnailsSection.style.display = 'none';
    
    // Update reference images sections
    globalReferenceToggle.checked = true;
    globalReferencesSection.style.display = 'block';
    titleReferencesSection.style.display = 'none';
    
    // Clear per-title references
    titleReferenceImages.innerHTML = '<p class="empty-state">No reference images uploaded</p>';
    
    // Update sidebar active state
    const titleItems = document.querySelectorAll('.title-item');
    titleItems.forEach(item => {
        item.classList.remove('active');
    });
}

// Save data to server
async function saveData() {
    try {
        await ServerAPI.saveTitles(titles);
        return true;
    } catch (error) {
        console.error('Error saving data to server:', error);
        alert('Failed to save data to server. Please try again.');
        return false;
    }
}

// Generate unique ID
function generateID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Close the prompt details modal
function closePromptModal() {
    promptModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Load thumbnails for a title
async function loadThumbnails(titleId) {
    try {
        console.log(`Fetching thumbnails for title ${titleId} from backend...`);
        const response = await getThumbnails(titleId);
        let thumbnails = response.data.thumbnails || [];
        thumbnails = thumbnails.map((t, i) => ({ ...t, index: i }));
        currentReferenceDataMap = response.data.referenceDataMap || {};
        // console.log('Received thumbnails data:', thumbnails);
        
        // Update current title thumbnails
        if (currentTitle && currentTitle.id === titleId) {
            currentTitle.thumbnails = thumbnails;
            renderSavedThumbnails(currentTitle);
        }
        
        return thumbnails;
    } catch (error) {
        console.error('Error loading thumbnails:', error);
        currentReferenceDataMap = {};
        throw error;
    }
}
function pollBatchStatus(titleId, startIndex, qty, batchId) {
    console.log(" ---- pollBatchStatus ---- ");
    console.log("***titleId, startIndex, qty, batchId", titleId, startIndex, qty, batchId);
    
    // Shorter initial intervals that gradually increase
    let intervalMs = 1000; // Start with 1 second
    const maxInterval = 3000; // Max 3 seconds
    const intervalIncrease = 500; // Increase by 0.5 seconds each time
    const maxRetries = 15;
    let retries = 0;
    
    const timerId = setInterval(async () => {
      try {
        console.log("***getThumbnails pollBatchStatus");
        const resp = await getThumbnailsBatch(titleId, startIndex, qty);
        
        // pick only our batch
        const batch = resp.data.thumbnails
        if (batch.length === 0) {
            retries++;
            console.log("Waiting for batch to be registered... attempt", retries);
    
            if (retries >= maxRetries) {
              console.warn("No batch found after waiting, stopping poll.");
              clearInterval(timerId);
              return;
            }
            
            // Gradually increase the interval
            intervalMs = Math.min(maxInterval, intervalMs + intervalIncrease);
            clearInterval(timerId);
            setTimeout(() => pollBatchStatus(titleId, startIndex, qty, batchId), intervalMs);
            return; 
        }
        
        console.log("***batch11", batch);
        let allComplete = true;
        
        batch.forEach(t => {
            const wrapper = document.getElementById(`thumb-${t.index}`);
            console.log("***wrapper11", wrapper);
            if (!wrapper) return;
            
            if (t.status === 'completed' || t.status === 'failed') {
                // done → render real thumbnail
                console.log("Completed that batch ***t.status11", t.status);
                renderThumbnail(t, t.index);
            } else {
                allComplete = false;
                // still pending → update this card's %
                const doneCount = batch.filter(x =>
                    x.status==='completed'||x.status==='failed'
                ).length;
                // const pct = Math.floor((doneCount / qty)*100);
                
                // const num = wrapper.querySelector('.progress-number');
                // const fill = wrapper.querySelector('.progress-fill');
                // if (num) num.textContent = `${pct}%`;
                // if (fill) fill.style.width = `${pct}%`;
            }
        });
  
        // stop if all complete
        if (allComplete) {
            clearInterval(timerId);
        } else {
            // Gradually increase the interval for subsequent checks
            intervalMs = Math.min(maxInterval, intervalMs + intervalIncrease);
            clearInterval(timerId);
            setTimeout(() => pollBatchStatus(titleId, startIndex, qty, batchId), intervalMs);
        }
      } catch (err) {
        console.error('Batch polling error:', err);
        clearInterval(timerId);
      }
    }, intervalMs);
}
function pollBatchStatusMock(startIndex, qty, batchId) {
    // create a fake array of statuses
    const fake = Array.from({length: qty}, (_, i) => ({
      index: startIndex + i,
      status: 'pending'
    }));
    
    let completed = 0;
    const interval = setInterval(() => {
      // 1) mark one more as done
      if (completed < qty) {
        fake[completed].status = 'completed';
        completed++;
      }
      
      // 2) update each loader's % & maybe swap it out
      fake.forEach(t => {
        const wrapper = document.getElementById(`thumb-${t.index}`);
        if (!wrapper || wrapper.dataset.batchId !== batchId) return;
        
        const pct = Math.floor((completed/qty)*100);
        const num  = wrapper.querySelector('.progress-number');
        const fill = wrapper.querySelector('.progress-fill');
        if (num)  num.textContent = `${pct}%`;
        if (fill) fill.style.width   = `${pct}%`;
        
        // once this one is "complete", swap in a dummy image
        if (t.status === 'completed') {
          renderThumbnail({
            id: `mock-${t.index}`,
            image_url: 'https://placehold.co/600x400/77dd77/ffffff?text=Done',
            summary: `Mock thumbnail ${t.index+1}`,
            status: 'completed',
            index: t.index,
            promptDetails: { title:'Mock', instructions:'', summary:'', referenceCount:0, referenceImages:[], fullPrompt:'' }
          }, t.index);
        }
      });
      
      // 3) stop once we've done them all
      if (completed >= qty) clearInterval(interval);
    }, 500);
}

// Poll for thumbnail generation status
async function pollThumbnailStatus(titleId, quantity, startIndex = 0) {
    await new Promise(r => setTimeout(r, 0));
    let extraAppended = false;
    const intervalMs = 3000; // Poll every 3 seconds
    const timerId = setInterval(async () => {
        try {
            const { data } = await getThumbnails(titleId, startIndex, quantity);
        //    console.log(" ---- pollThumbnailStatus ---- ");
        //    console.log(data);
            const thumbs = data.thumbnails;
            
            const doneCount = thumbs.filter(t => t.status === 'completed' || t.status === 'failed').length;
            const pct = Math.floor((doneCount / quantity) * 100);
            
            // global progress
            ai2Progress.style.width = `${pct}%`;
            ai2Status.textContent = `Generating images... ${doneCount}/${quantity} complete`;
            if (pct >= 20 && !extraAppended) {
            //    alert("extraAppended we have 20%");
              }
            // Handle each thumbnail individually
            thumbs.forEach(t => {
                const loader = document.getElementById(`thumb-loader-${t.index}`);
                if (!loader) return;
                
                if (t.status === 'completed' || t.status === 'failed') {
                    // Replace loader with actual thumbnail as soon as it's ready
                    console.log(`Thumbnail ${t.index} completed, rendering...`);
                    renderThumbnail(t, t.index);
                } else  {
                    // Update loader progress
                    console.log(`Thumbnail ${t.index} is still pending…`);
                    const progEl = loader.querySelector('.progress-number');
                    if (progEl) progEl.textContent = `${pct}%`;
                    // const prog = loader.querySelector('.progress-number');
                    // if (prog) {
                    //     const seconds = parseInt(prog.textContent);
                    //     prog.textContent = `${seconds + 1}s`;
                    // }
                }
            });
            
            // Stop polling only when all are done
            if (doneCount >= quantity) {
                console.log('All thumbnails completed, stopping poll');
                clearInterval(timerId);
                // showLoading(false);
                moreThumbnailsSection.style.display = 'block';
            }
        } catch (err) {
            console.error('Polling error:', err);
        }
    }, intervalMs);
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 