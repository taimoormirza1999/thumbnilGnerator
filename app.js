// Import API service
import { 
  login, register, getProfile, 
  createTitle, getTitles, getTitle, updateTitle, deleteTitle,
  uploadReference, getReferences, getGlobalReferences, deleteReference,
  generateThumbnails, getThumbnails
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
// Store active generation requests
let activeGenerationRequests = {};

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

// Keep track of currently active polling processes
const activePollingProcesses = {};
// Initialize the application
async function init() {
    console.log("Initializing app...");
    showLoading(true);
    
    // Initialize activeGenerationRequests from localStorage if it exists
    try {
        const storedRequests = localStorage.getItem('activeGenerationRequests');
        if (storedRequests) {
            activeGenerationRequests = JSON.parse(storedRequests);
        }
    } catch (error) {
        console.error('Error loading activeGenerationRequests from localStorage:', error);
        activeGenerationRequests = {};
    }
    
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
            document.getElementById('username-display').textContent = "@"+currentUser.username;
            
            // Load data
            await loadUserData();
            
            // Check for any pending thumbnail generation requests
            checkPendingGenerationRequests();
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
    console.log("Loading indicator:", show ? "SHOWING" : "HIDING");
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
        const lastId = localStorage.getItem('lastTitleId');
        if (lastId) {
            const elem = document.querySelector(`.title-item[data-id="${lastId}"]`);
            if (elem) {
                elem.click();
            }
            }
        console.log('LUD: Rendering global reference images...');
        renderReferenceImages(globalReferences, globalReferenceImages);
        console.log('LUD: Global reference images rendered.');
        
        // Show main app container and hide login/register forms
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';

        // If titles are loaded, start polling for the first one for demonstration
        if (titles && titles.length > 0) {
            const firstTitleId = titles[0].id;
            const defaultQuantity = 5;
            console.log(`LUD: Automatically starting polling for title ID: ${firstTitleId}, quantity: ${defaultQuantity}`);
            // pollThumbnailStatus(firstTitleId, defaultQuantity);
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
         // Set username in the UI
         document.getElementById('username-display').textContent = "@"+currentUser.username;
        await loadUserData();
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

function cardLoader(index) {
    const card = document.createElement('div');
    card.className = 'thumbnail-item loading loader-card';
    card.id = `thumb-loader-${index}`;

    card.innerHTML = `
     <div class="thumbnail-centered-loader ">
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>  
        <img src="icons/loading_imge.svg" alt="Loading" class="loading-icon">
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
    return card;
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
    console.log("Setting up event listeners...");
    
    // New Title Button
    newTitleBtn.addEventListener('click', () => {
        clearMainContent();
        titleInput.focus();
    });
    
    // Generate Button
    generateBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        if (!title) {
            alert('Please enter a title');
            return;
        }
        
        // Generate a unique batch ID for this generation request
        const batchId = Date.now().toString();
        
        // Make sure empty state is hidden
        thumbnailsEmptyState.style.display = 'none';
        
        try {
            const instructions = customInstructions.value.trim();
            const quantity = parseInt(quantitySelect.value) || 5;
            
            console.log("Creating/updating title:", { title, instructions });
            
            // Check if this is a new title or existing one
            if (!currentTitle || currentTitle.title !== title) {
                // Create new title
                console.log("Creating new title");
                const response = await createTitle(title, instructions);
                console.log("Title created:", response.data);
                currentTitle = response.data;
            } else {
                // Update existing title
                console.log("Updating existing title:", currentTitle.id);
                const response = await updateTitle(currentTitle.id, title, instructions);
                console.log("Title updated:", response.data);
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
            
            // Store this generation request in localStorage before API call
            // This ensures we can resume even if the request times out
            storeGenerationRequest(currentTitle.id, quantity);
            
            // Show batch loading cards at the beginning of the grid
            showBatchLoadingCards(quantity, 0, batchId);
            
            // Update progress UI
            progressSection.style.display = 'block';
            ai1Status.textContent = 'Generating thumbnail ideas...';
            ai1Progress.style.width = '0%';
            simulateProgress(ai1Progress, null, null, 'Thumbnail concepts ready!', 3000, () => {
                ai2Status.textContent = 'Creating images... 0/' + quantity + ' complete';
                ai2Progress.style.width = '0%';
            });
            
            try {
                // Generate thumbnails
                console.log("Generating thumbnails for title ID:", currentTitle.id, "Quantity:", quantity);
                await generateThumbnails(currentTitle.id, quantity);
                console.log("Thumbnails generation started, polling for status");
            } catch (error) {
                // Check if it's our special timeout error, which means the server might still be processing
                if (error.isProcessingTimeout) {
                    console.log("Thumbnail generation request timed out, but we'll keep polling for results");
                    showNotification("Request is taking longer than expected. Your thumbnails will continue generating in the background.");
                } else {
                    // For other errors, re-throw to be caught by the outer catch block
                    throw error;
                }
            }
            
            // Start polling for thumbnail status in either case (success or timeout)
            pollThumbnailStatus(currentTitle.id, quantity, 0, batchId);

            // Refresh titles list after starting generation/polling
            console.log("Refreshing titles list");
            const titlesResponse = await getTitles();
            titles = titlesResponse.data.titles;
            renderTitlesList();
        } catch (error) {
            console.error('Error generating thumbnails:', error);
            
            // More detailed error information
            if (error.response) {
                console.error("Server responded with error:", error.response.status);
                console.error("Error data:", error.response.data);
                alert(`Server error (${error.response.status}): ${error.response.data?.error || 'Unknown error'}`);
            } else if (error.request) {
                console.error("No response received:", error.request);
                alert('No response from server. Please check if the backend is running.');
            } else {
                console.error("Request setup error:", error.message);
                alert(`Error: ${error.message}`);
            }
            
            // Remove any loading cards for this batch
            document.querySelectorAll(`.thumbnail-item[data-batch-id="${batchId}"]`).forEach(loader => {
                if (loader.dataset.timerId) {
                    clearInterval(parseInt(loader.dataset.timerId));
                }
                loader.remove();
            });
            
            // Show empty state if no thumbnails left
            if (thumbnailsGrid.children.length === 0) {
                thumbnailsEmptyState.style.display = 'block';
            }
            progressSection.style.display = 'none';
            
            // Clean up the active generation request in case of a true error
            if (currentTitle && currentTitle.id) {
                removeGenerationRequest(currentTitle.id);
            }
        }
    });
    
    // More Thumbnails Button
    moreThumbnailsBtn.addEventListener('click', async () => {
        if (!currentTitle) return;
        
        try {
            const quantity = parseInt(quantitySelect.value) || 3;
            
            // Generate more thumbnails
            await generateThumbnails(currentTitle.id, quantity);
            
            // Start polling for the additional thumbnails
            pollThumbnailStatus(currentTitle.id, currentTitle.thumbnails.length + quantity);
        } catch (error) {
            console.error('Error generating more thumbnails:', error);
            alert('Failed to generate additional thumbnails. Please try again.');
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
        console.log("Login form listener attached");
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
    
    // Before unload handler - check if there are any active requests
    window.addEventListener('beforeunload', (event) => {
        // Check if there are any active generation requests
        const hasActiveRequests = Object.keys(activeGenerationRequests).length > 0;
        
        // If we have active requests, show a warning
        if (hasActiveRequests) {
            const message = 'You have thumbnail generation in progress. If you leave or refresh, it will continue in the background.';
            event.returnValue = message;
            return message;
        }
    });
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
            console.log(`Successfully loaded title details:`, currentTitle);
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
            console.log(`Successfully loaded thumbnails:`, thumbnails);
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
        const thumbnails = response.data.thumbnails || [];
        currentReferenceDataMap = response.data.referenceDataMap || {}; // Store the map
        console.log('Received thumbnails data:', thumbnails);
        console.log('Received reference data map:', currentReferenceDataMap);
        
        // Update current title thumbnails
        if (currentTitle && currentTitle.id === titleId) {
            currentTitle.thumbnails = thumbnails;
            renderSavedThumbnails(currentTitle);
        }
        
        return thumbnails;
    } catch (error) {
        console.error('Error loading thumbnails:', error);
        currentReferenceDataMap = {}; // Clear map on error
        throw error;
    }
}

// Check for any pending thumbnail generation requests after page refresh
function checkPendingGenerationRequests() {
    try {
        const storedRequests = localStorage.getItem('activeGenerationRequests');
        if (storedRequests) {
            const requests = JSON.parse(storedRequests);
            const now = Date.now();
            let hasActiveTasks = false;
            let mostRecentTitleId = null;
            let mostRecentTimestamp = 0;
            
            // Check each stored request
            Object.keys(requests).forEach(titleId => {
                const request = requests[titleId];
                // Only resume polling if the request is recent (less than 10 minutes old)
                if (now - request.timestamp < 10 * 60 * 1000) {
                    console.log(`Resuming polling for title ID: ${titleId}, quantity: ${request.quantity}`);
                    
                    // Just hide empty state without clearing existing thumbnails
                    thumbnailsEmptyState.style.display = 'none';
                    
                    // Create card loaders for this request
                    const existingThumbnails = document.querySelectorAll('.thumbnail-item:not(.loading)').length;
                    for (let i = 0; i < request.quantity; i++) {
                        // Check if a loader for this thumbnail already exists
                        const existingLoader = document.getElementById(`thumb-${existingThumbnails + i}`);
                        if (!existingLoader) {
                            const wrapper = document.createElement('div');
                            wrapper.id = `thumb-${existingThumbnails + i}`;
                            wrapper.className = 'thumbnail-item loading';
                            
                            const loader = cardLoader(existingThumbnails + i);
                            wrapper.appendChild(loader);
                            
                            thumbnailsGrid.insertBefore(wrapper, thumbnailsGrid.firstChild);
                        }
                    }
                    
                    // Resume polling
                    pollThumbnailStatus(titleId, request.quantity);
                    hasActiveTasks = true;
                    
                    // Keep track of the most recent request to focus on that one
                    if (request.timestamp > mostRecentTimestamp) {
                        mostRecentTimestamp = request.timestamp;
                        mostRecentTitleId = titleId;
                    }
                }
            });
            
            // If we found and resumed active tasks, show the progress section
            if (hasActiveTasks) {
                progressSection.style.display = 'block';
                // Set AI1 as complete since we're resuming
                ai1Status.textContent = 'Thumbnail ideas generated';
                ai1Progress.style.width = '100%';
                // Set AI2 as in progress
                ai2Status.textContent = 'Creating images... resuming progress tracking';
                ai2Progress.style.width = '50%'; // Will be updated on next poll
                
                // If we have a most recent title ID and it's not already the current title,
                // try to load that title to restore the user's view
                if (mostRecentTitleId && (!currentTitle || currentTitle.id !== parseInt(mostRecentTitleId))) {
                    console.log(`Trying to load the title with active generation: ${mostRecentTitleId}`);
                    
                    // Find the title item in the sidebar and click it
                    const titleItem = document.querySelector(`.title-item[data-id="${mostRecentTitleId}"]`);
                    if (titleItem) {
                        titleItem.click();
                    } else {
                        // If the title item isn't in the sidebar yet, try to load it directly
                        loadTitleById(mostRecentTitleId);
                    }
                }
                
                // Show a notification that we've resumed a task
                showNotification('Resumed in-progress thumbnail generation. Your request is still being processed.');
            }
            
            // Clean up old requests
            cleanupOldRequests(requests);
        }
    } catch (error) {
        console.error('Error checking pending generation requests:', error);
        // Clear the storage if it's corrupted
        localStorage.removeItem('activeGenerationRequests');
    }
}

// Clean up old requests from localStorage
function cleanupOldRequests(requests) {
    const now = Date.now();
    let updated = false;
    
    Object.keys(requests).forEach(titleId => {
        // Remove requests older than 10 minutes
        if (now - requests[titleId].timestamp > 10 * 60 * 1000) {
            delete requests[titleId];
            updated = true;
        }
    });
    
    if (updated) {
        if (Object.keys(requests).length > 0) {
            localStorage.setItem('activeGenerationRequests', JSON.stringify(requests));
        } else {
            localStorage.removeItem('activeGenerationRequests');
        }
    }
}

// Store a new generation request
function storeGenerationRequest(titleId, quantity) {
    try {
        // Get existing requests or initialize empty object
        const storedRequests = localStorage.getItem('activeGenerationRequests');
        const requests = storedRequests ? JSON.parse(storedRequests) : {};
        
        // Add/update this request
        requests[titleId] = {
            timestamp: Date.now(),
            quantity: quantity
        };
        
        // Store back to localStorage
        localStorage.setItem('activeGenerationRequests', JSON.stringify(requests));
        activeGenerationRequests = requests;
    } catch (error) {
        console.error('Error storing generation request:', error);
    }
}

// Remove a completed generation request
function removeGenerationRequest(titleId) {
    try {
        const storedRequests = localStorage.getItem('activeGenerationRequests');
        if (storedRequests) {
            const requests = JSON.parse(storedRequests);
            
            if (requests[titleId]) {
                delete requests[titleId];
                
                // Update localStorage
                if (Object.keys(requests).length > 0) {
                    localStorage.setItem('activeGenerationRequests', JSON.stringify(requests));
                } else {
                    localStorage.removeItem('activeGenerationRequests');
                }
                activeGenerationRequests = requests;
            }
        }
    } catch (error) {
        console.error('Error removing generation request:', error);
    }
}

// Poll for thumbnail generation status
async function pollThumbnailStatus(titleId, expectedQuantity, attempt = 0, batchId) {
    // If polling is already in progress for this title, don't start another one
    if (activePollingProcesses[titleId] && attempt === 0) {
        console.log(`[Poll] Already polling for title ${titleId}, skipping new polling request`);
        return;
    }
    
    // Mark this title as being polled if this is the first attempt
    if (attempt === 0) {
        activePollingProcesses[titleId] = true;
    }
    
    console.log(`[Poll #${attempt + 1}] Polling for thumbnails for title ${titleId}`);
    const maxAttempts = 60; // Poll for up to 3 minutes (60 * 3s)
    const pollInterval = 3000; // Poll every 3 seconds
    const backoffFactor = 1.5; // Increase interval time after errors

    // If we've reached the maximum number of attempts, stop polling
    if (attempt >= maxAttempts) {
        console.warn(`[Poll] Reached maximum number of attempts (${maxAttempts})`);
        finishPolling(titleId, "Polling timed out - the server might still be processing your request. Check back later.", batchId);
        return;
    }

    try {
        // Get the thumbnails from the server
        const response = await getThumbnails(titleId);
        const thumbnails = response.data.thumbnails || [];
        currentReferenceDataMap = response.data.referenceDataMap || {}; 
        
        // Filter only the thumbnails belonging to the current title
        const relevantThumbnails = thumbnails.filter(t => t.title_id === titleId); 

        // Count thumbnails by status
        let completedCount = 0;
        let processingCount = 0;
        let pendingCount = 0;
        let failedCount = 0;

        // Find all loading cards with this batch ID
        const loaderCards = document.querySelectorAll(`.thumbnail-item.loading[data-batch-id="${batchId}"]`);
        
        // Process each completed thumbnail
        relevantThumbnails.forEach((thumbnail, index) => {
            // Update counts based on status
            if (thumbnail.status === 'completed') {
                completedCount++;
                
                // Find a loading card to replace
                if (index < loaderCards.length) {
                    const loader = loaderCards[index];
                    
                    // Create a new thumbnail element
                    const thumbElement = document.createElement('div');
                    thumbElement.className = 'thumbnail-item';
                    thumbElement.id = loader.id;
                    thumbElement.dataset.id = thumbnail.id;
                    
                    // Add the image
                    const img = document.createElement('img');
                    img.src = thumbnail.image_url;
                    img.alt = thumbnail.summary || 'Generated thumbnail';
                    img.className = 'thumbnail-image';
                    thumbElement.appendChild(img);
                    
                    // Add actions
                    const actions = document.createElement('div');
                    actions.className = 'thumbnail-actions';
                    
                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'action-btn';
                    downloadBtn.textContent = 'Download';
                    downloadBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        alert(`Downloading: ${thumbnail.summary || 'thumbnail'}`);
                    });
                    
                    const regenerateBtn = document.createElement('button');
                    regenerateBtn.className = 'action-btn';
                    regenerateBtn.textContent = 'Regenerate';
                    regenerateBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        regenerateSingleThumbnail(index, thumbnail.id);
                    });
                    
                    actions.appendChild(downloadBtn);
                    actions.appendChild(regenerateBtn);
                    thumbElement.appendChild(actions);
                    
                    // Add click to view details
                    thumbElement.addEventListener('click', () => {
                        showPromptDetails(thumbnail);
                    });
                    
                    // Replace the loader with the completed thumbnail
                    if (loader.dataset.timerId) {
                        clearInterval(parseInt(loader.dataset.timerId));
                    }
                    loader.parentNode.replaceChild(thumbElement, loader);
                }
            } else if (thumbnail.status === 'failed') {
                failedCount++;
                
                // Similar handling for failed thumbnails
                if (index < loaderCards.length) {
                    const loader = loaderCards[index];
                    
                    // Create error display
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'thumbnail-item thumbnail-error';
                    errorDiv.id = loader.id;
                    
                    const errorIcon = document.createElement('div');
                    errorIcon.className = 'error-icon';
                    errorIcon.innerHTML = '!';
                    
                    const errorMessage = document.createElement('p');
                    errorMessage.className = 'error-message';
                    errorMessage.textContent = thumbnail.error_message || 'Thumbnail generation failed';
                    
                    const retryBtn = document.createElement('button');
                    retryBtn.className = 'action-btn';
                    retryBtn.textContent = 'Try Again';
                    retryBtn.addEventListener('click', () => {
                        regenerateSingleThumbnail(index, thumbnail.id);
                    });
                    
                    errorDiv.appendChild(errorIcon);
                    errorDiv.appendChild(errorMessage);
                    errorDiv.appendChild(retryBtn);
                    
                    // Replace the loader
                    if (loader.dataset.timerId) {
                        clearInterval(parseInt(loader.dataset.timerId));
                    }
                    loader.parentNode.replaceChild(errorDiv, loader);
                }
            } else if (thumbnail.status === 'processing') {
                processingCount++;
            } else {
                pendingCount++;
            }
        });

        const totalRelevant = relevantThumbnails.length;
        const finishedCount = completedCount + failedCount;
        
        console.log(`[Poll] Status: ${completedCount} completed, ${failedCount} failed, ${processingCount} processing, ${pendingCount} pending out of ${totalRelevant}`);

        // Update progress UI
        ai1Status.textContent = 'Thumbnail ideas generated';
        ai1Progress.style.width = '100%';
        
        // Update progress percentage based on completed/failed thumbnails
        const progressPercentage = totalRelevant > 0 ? (finishedCount / totalRelevant) * 100 : 0;
        ai2Status.textContent = `Creating images... ${finishedCount}/${totalRelevant} complete`;
        ai2Progress.style.width = `${progressPercentage}%`;

        // Check if polling is complete - either all thumbnails are done or we have at least the expected quantity
        if ((finishedCount === totalRelevant && totalRelevant > 0) || 
            (finishedCount >= expectedQuantity && finishedCount > 0)) {
            finishPolling(titleId, null, batchId);
            
            // If all thumbnails are ready, update the current title's thumbnails
            if (currentTitle && currentTitle.id === parseInt(titleId)) {
                currentTitle.thumbnails = relevantThumbnails;
                moreThumbnailsSection.style.display = 'block';
            }
            
            return;
        }

        // Not all thumbnails are completed, schedule next poll
        console.log(`[Poll] Not all thumbnails are ready yet. Scheduling next poll in ${pollInterval}ms`);
        setTimeout(() => pollThumbnailStatus(titleId, expectedQuantity, attempt + 1, batchId), pollInterval);
    } catch (error) {
        console.error(`[Poll] Error during polling (attempt ${attempt + 1}):`, error);
        
        // For network errors, use exponential backoff instead of immediately giving up
        if (attempt < maxAttempts - 1) {
            const adjustedInterval = Math.min(pollInterval * Math.pow(backoffFactor, Math.min(attempt, 5)), 30000);
            console.log(`[Poll] Retrying in ${adjustedInterval}ms (attempt ${attempt + 1}/${maxAttempts})`);
            setTimeout(() => pollThumbnailStatus(titleId, expectedQuantity, attempt + 1, batchId), adjustedInterval);
        } else {
            finishPolling(titleId, "Could not connect to the server to check thumbnail status. Please try again later.", batchId);
        }
    }
}

// Helper function to finish polling and clean up
function finishPolling(titleId, errorMessage, batchId) {
    console.log(`[Poll] Finishing polling for title ${titleId}`);
    
    // Hide the progress section
    progressSection.style.display = 'none';
    
    // Show error message if provided
    if (errorMessage) {
        showNotification(errorMessage, 10000);
    }
    
    // Remove this request from the active list
    removeGenerationRequest(titleId);
    
    // Mark polling as complete for this title
    delete activePollingProcesses[titleId];
    
    // Try to load the final thumbnails one more time
    if (currentTitle && currentTitle.id === parseInt(titleId)) {
        loadThumbnails(titleId).catch(e => console.error("Error loading final thumbnails:", e));
    }
    
    // Clear any remaining loading animations/intervals
    const loaders = document.querySelectorAll('.thumbnail-item.loading');
    loaders.forEach(loader => {
        if (loader.dataset.timerId) {
            clearInterval(parseInt(loader.dataset.timerId));
        }
    });
}

// Make sure thumbnail placeholders exist, create them if not
function ensureThumbnailPlaceholders(currentCount, expectedCount) {
    // If we don't have any thumbnails showing or fewer than expected, create placeholder loading thumbnails
    const existingThumbnails = document.querySelectorAll('.thumbnail-item:not(.loading)').length;
    const existingLoaders = document.querySelectorAll('.thumbnail-item.loading').length;
    const totalExisting = existingThumbnails + existingLoaders;
    
    // Calculate how many additional placeholders we need
    const count = Math.max(currentCount, expectedCount);
    const neededPlaceholders = Math.max(0, count - totalExisting);
    
    if (neededPlaceholders > 0) {
        console.log(`[Poll] Creating ${neededPlaceholders} thumbnail placeholders`);
        for (let i = 0; i < neededPlaceholders; i++) {
            const wrapper = document.createElement('div');
            wrapper.id = `thumb-${totalExisting + i}`;
            wrapper.className = 'thumbnail-item loading';
            
            const loader = cardLoader(totalExisting + i);
            wrapper.appendChild(loader);
            
            // Add to the beginning of the grid so newest are on top
            thumbnailsGrid.insertBefore(wrapper, thumbnailsGrid.firstChild);
        }
        
        // Make sure the empty state is hidden
        thumbnailsEmptyState.style.display = 'none';
    }
}

// Load a title by ID (for resuming from refresh)
async function loadTitleById(titleId) {
    try {
        showLoading(true);
        
        // Get the title details
        const titleResponse = await getTitle(titleId);
        if (!titleResponse.data) {
            console.error(`Title with ID ${titleId} not found`);
            return;
        }
        
        // Create a title object that we can pass to loadTitle
        const titleObj = { ...titleResponse.data, id: titleId };
        
        // Use the existing loadTitle function
        await loadTitle(titleObj);
    } catch (error) {
        console.error(`Error loading title by ID ${titleId}:`, error);
    } finally {
        showLoading(false);
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

function showBatchLoadingCards(qty, startIndex, batchId) {
    for (let i = 0; i < qty; i++) {
      const idx = startIndex + i;

      // Create the wrapper that renderThumbnail expects
      const wrapper = document.createElement('div');
      wrapper.id = `thumb-${idx}`;
      wrapper.dataset.batchId = batchId;
      wrapper.className = 'thumbnail-item loading';

      // Insert spinner/progress inside it
      const loader = cardLoader(idx);
      wrapper.appendChild(loader);
      
      // Prepend so newest are on top
      thumbnailsGrid.insertBefore(wrapper, thumbnailsGrid.firstChild);
    }
}

// Render a thumbnail in the grid
function renderThumbnail(thumbnail, index) {
    const thumbContainer = document.getElementById(`thumb-${index}`);
    if (!thumbContainer) return;
    
    // Clear existing content
    thumbContainer.innerHTML = '';
    thumbContainer.className = 'thumbnail-item';
    thumbContainer.dataset.id = thumbnail.id;
    
    // Add the image
    const img = document.createElement('img');
    img.src = thumbnail.image_url;
    img.alt = thumbnail.summary || 'Generated thumbnail';
    img.className = 'thumbnail-image';
    thumbContainer.appendChild(img);
    
    // Add actions
    const actions = document.createElement('div');
    actions.className = 'thumbnail-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'action-btn';
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        alert(`Downloading: ${thumbnail.summary || 'thumbnail'}`);
    });
    
    const regenerateBtn = document.createElement('button');
    regenerateBtn.className = 'action-btn';
    regenerateBtn.textContent = 'Regenerate';
    regenerateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        regenerateSingleThumbnail(index, thumbnail.id);
    });
    
    actions.appendChild(downloadBtn);
    actions.appendChild(regenerateBtn);
    thumbContainer.appendChild(actions);
    
    // Add click to view details
    thumbContainer.addEventListener('click', () => {
        showPromptDetails(thumbnail);
    });
}

function regenerateSingleThumbnail(index, thumbnailId) {
    if (!currentTitle) return;
    
    try {
        // Show loading state for this thumbnail
        const thumbContainer = document.getElementById(`thumb-${index}`);
        if (thumbContainer) {
            thumbContainer.innerHTML = '';
            thumbContainer.className = 'thumbnail-item loading';
            const loader = cardLoader(index);
            thumbContainer.appendChild(loader);
        }
        
        // Make API call to regenerate thumbnail
        ServerAPI.regenerateThumbnail(currentTitle, 
            globalReferenceToggle.checked ? globalReferences : currentTitle.references,
            index
        )
        .then(thumbnail => {
            // Update the thumbnail in the current title
            const thumbnailIndex = currentTitle.thumbnails.findIndex(t => t.id === thumbnailId);
            if (thumbnailIndex !== -1) {
                currentTitle.thumbnails[thumbnailIndex] = thumbnail;
            } else {
                currentTitle.thumbnails.push(thumbnail);
            }
            
            // Render the updated thumbnail
            renderThumbnail(thumbnail, index);
        })
        .catch(error => {
            console.error('Error regenerating thumbnail:', error);
            
            // Show error state
            if (thumbContainer) {
                thumbContainer.innerHTML = '';
                thumbContainer.className = 'thumbnail-item thumbnail-error';
                
                const errorIcon = document.createElement('div');
                errorIcon.className = 'error-icon';
                errorIcon.innerHTML = '!';
                
                const errorMessage = document.createElement('p');
                errorMessage.className = 'error-message';
                errorMessage.textContent = 'Failed to regenerate thumbnail';
                
                const retryBtn = document.createElement('button');
                retryBtn.className = 'action-btn';
                retryBtn.textContent = 'Try Again';
                retryBtn.addEventListener('click', () => {
                    regenerateSingleThumbnail(index, thumbnailId);
                });
                
                thumbContainer.appendChild(errorIcon);
                thumbContainer.appendChild(errorMessage);
                thumbContainer.appendChild(retryBtn);
            }
        });
    } catch (error) {
        console.error('Error setting up thumbnail regeneration:', error);
    }
}

// Show prompt details in modal
function showPromptDetails(thumbnail) {
    if (!thumbnail || !thumbnail.promptDetails) {
        console.error('No prompt details available for this thumbnail');
        return;
    }
    
    // Set modal content
    modalImage.src = thumbnail.image_url;
    promptSummary.textContent = thumbnail.summary || 'No summary available';
    promptTitle.textContent = thumbnail.promptDetails.title || 'No title';
    promptInstructions.textContent = thumbnail.promptDetails.instructions || 'No custom instructions';
    
    // Set reference count
    const refCount = thumbnail.promptDetails.referenceCount || 0;
    referenceCount.textContent = `${refCount} reference image${refCount !== 1 ? 's' : ''}`;
    
    // Clear previous reference thumbnails
    referenceThumbnails.innerHTML = '';
    
    // Add reference thumbnails if available
    if (thumbnail.promptDetails.referenceImages && thumbnail.promptDetails.referenceImages.length > 0) {
        thumbnail.promptDetails.referenceImages.forEach(refImg => {
            const refThumb = document.createElement('img');
            refThumb.src = refImg;
            refThumb.className = 'reference-thumbnail';
            referenceThumbnails.appendChild(refThumb);
        });
    } else {
        referenceThumbnails.innerHTML = '<p>No reference images used</p>';
    }
    
    // Set full prompt
    fullPrompt.textContent = thumbnail.promptDetails.fullPrompt || 'Full prompt not available';
    
    // Show the modal
    promptModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Simulate progress animation for progress bars
function simulateProgress(progressElement, startPct = 0, endPct = 100, completionMessage = null, duration = 2000, callback = null) {
    if (!progressElement) return;
    
    // Initialize
    let startTime = null;
    const start = startPct || 0;
    const end = endPct || 100;
    const statusElement = progressElement.nextElementSibling;
    
    // Animation function
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentPct = start + (progress * (end - start));
        
        // Update progress bar width
        progressElement.style.width = `${currentPct}%`;
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Complete - set final width and message
            progressElement.style.width = `${end}%`;
            if (completionMessage && statusElement) {
                statusElement.textContent = completionMessage;
            }
            
            // Execute callback if provided
            if (callback && typeof callback === 'function') {
                callback();
            }
        }
    }
    
    // Start animation
    requestAnimationFrame(animate);
} 