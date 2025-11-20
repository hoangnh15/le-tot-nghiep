document.addEventListener('DOMContentLoaded', function() {
    
    // === CẤU HÌNH GOOGLE SHEET ===
    // Dán đường dẫn CSV bạn vừa copy ở Bước 1 vào đây:
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlxRqFfzpic6mbN_VzhOx7Rg1TIvFr5xwH0CyPAPLauAWNaoDlo_TWlAgvG0EneuCBRFN88vvctQ0C/pub?gid=0&single=true&output=csv';
    const MIN_LOADING_TIME = 1500;
    // Hàm đọc CSV và tìm tên
    async function fetchGuestName() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const guestCode = urlParams.get('name'); 
            const nameElement = document.getElementById('guest-name');

            if (!guestCode || !nameElement) return; 

            const response = await fetch(SHEET_CSV_URL);
            const data = await response.text();
            const rows = data.split('\n');
            let foundName = "";
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cols = row.split(','); 
                if (cols.length >= 2) {
                    const currentCode = cols[0].trim();
                    if (currentCode === guestCode) {
                        foundName = cols[1].replace(/^"|"$/g, '').trim();
                        break; 
                    }
                }
            }

            if (foundName) {
                nameElement.textContent = foundName;
            } 

        } catch (error) {
            console.error("Lỗi khi lấy tên khách mời:", error);
        }
    }

    // === QUẢN LÝ MÀN HÌNH CHỜ (PRELOADER) ===
    async function handlePreloader() {
        const preloader = document.getElementById('preloader');
        
        // 1. Tạo một lời hứa: "Phải chờ ít nhất 2 giây"
        const waitTimer = new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME));

        // 2. Tạo một lời hứa: "Phải tải xong tên từ Google Sheet"
        const dataFetcher = fetchGuestName();

        // 3. Chờ cả 2 việc xong xuôi
        await Promise.all([waitTimer, dataFetcher]);

        // 4. Mọi thứ đã xong, ẩn màn hình chờ
        if (preloader) {
            preloader.classList.add('fade-out');
            // Xóa hẳn khỏi DOM sau khi hiệu ứng mờ kết thúc (để không che nút bấm)
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 800); 
        }
    }

    // Gọi hàm quản lý preloader ngay lập tức
    handlePreloader();
    // --- 1. CẤU HÌNH ---
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgsnPQpqadJNKjQAJbJTzEnha50qtG1r5zo_Ttq4wm9Jm3aO1FBtqeEY5DlJRaeS1u7A/exec";

    // --- 2. XỬ LÝ MENU HAMBURGER ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeBtn = document.getElementById('close-btn');
    const sidebar = document.getElementById('sidebar-nav');
    const overlay = document.getElementById('overlay');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-links a');
    function openMenu() { sidebar.classList.add('open'); overlay.classList.add('open'); }
    function closeMenu() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }
    hamburgerBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
    navLinks.forEach(link => { link.addEventListener('click', closeMenu); });

    // --- 3. XỬ LÝ GALLERY ẢNH (SWIPER) ---
    const swiper = new Swiper('.gallery-swiper', {
        loop: true,
        autoplay: {
          delay: 1000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        },
        slidesPerView: 1, // Hiển thị 1 slide trên mobile
        spaceBetween: 15, 
        centeredSlides: true,
        grabCursor: true,
        navigation: { 
            nextEl: '.swiper-button-next', 
            prevEl: '.swiper-button-prev' 
        },
        breakpoints: {
            640: { slidesPerView: 2, spaceBetween: 20 },
            1024: { slidesPerView: 3, spaceBetween: 30 },
        }
    });

    const imageUpload = document.getElementById('image-upload');
    const uploadLabel = document.querySelector('.upload-label');

    // Chức năng: Tải ảnh từ Google Drive khi mở trang
    async function loadImagesFromGoogleDrive() {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL); 
            const data = await response.json();
            
            if (data.status === 'success' && data.images.length > 0) {
                const slides = data.images.map(url => createSlide(url));
                swiper.appendSlide(slides);
                swiper.update();
                swiper.autoplay.start();
            }
        } catch (error) {
            console.error("Lỗi khi tải ảnh từ Drive:", error);
        }
    }

    // Chức năng: Tạo HTML cho 1 slide
    function createSlide(dataUrl) {
        return `<div class="swiper-slide"><img src="${dataUrl}" alt="User image"></div>`;
    }

    // Chức năng: Xử lý upload ảnh
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        uploadLabel.textContent = "Đang xử lý...";
        uploadLabel.style.opacity = "0.7";
        uploadLabel.style.pointerEvents = "none";

        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onloadend = async function() {
            const base64data = reader.result; 
            
            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'cors',
                    body: JSON.stringify({
                        base64: base64data,
                        type: file.type,
                        name: file.name
                    })
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    const newSlide = createSlide(result.url);
                    swiper.prependSlide(newSlide);
                    swiper.update();
                    swiper.slideTo(0);
                } else {
                    alert("Upload thất bại: " + result.message);
                }
                
            } catch (error) {
                console.error("Lỗi khi upload:", error);
                alert("Đã xảy ra lỗi nghiêm trọng khi tải ảnh lên.");
            } finally {
                uploadLabel.innerHTML = '<i class="fas fa-plus"></i> Thêm ảnh của bạn';
                uploadLabel.style.opacity = "1";
                uploadLabel.style.pointerEvents = "auto";
                event.target.value = null;
            }
        };
        
        reader.onerror = function() {
            alert("Không thể đọc file ảnh.");
            uploadLabel.innerHTML = '<i class="fas fa-plus"></i> Thêm ảnh của bạn';
            uploadLabel.style.opacity = "1";
            uploadLabel.style.pointerEvents = "auto";
        };
    }

    // --- 4. KHỞI CHẠY ---
    imageUpload.addEventListener('change', handleImageUpload);
    loadImagesFromGoogleDrive();

    function startMobileAutoplay() {
        if (swiper && !swiper.autoplay.running) {
            swiper.autoplay.start();
        }
    }
    document.body.addEventListener('touchstart', startMobileAutoplay, { once: true });

    const refreshBtn = document.getElementById('refresh-gallery-btn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', reloadGallery); 
    }
    async function reloadGallery() {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        refreshBtn.disabled = true; 

        try {
            swiper.removeAllSlides();
            await loadImagesFromGoogleDrive(); 

        } catch (error) {
            console.error("Lỗi khi tải lại gallery:", error);
            alert("Không thể tải lại ảnh, vui lòng thử lại.");
        } finally {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Tải lại ảnh mới';
            refreshBtn.disabled = false; 
        }
    }

    // --- XỬ LÝ ẨN/HIỆN CHỈ DẪN CUỘN ---
    const scrollIndicator = document.getElementById('scroll-indicator');

    window.addEventListener('scroll', function() {
        // Nếu cuộn xuống quá 100px thì ẩn đi
        if (window.scrollY > 100) {
            scrollIndicator.classList.add('hidden');
        } else {
            // Nếu quay lại đầu trang thì hiện lại
            scrollIndicator.classList.remove('hidden');
        }
    });

    // --- XỬ LÝ CHUYỂN ĐỔI MAP (GOOGLE VS UIT) ---
    const btnGoogle = document.getElementById('btn-google-map');
    const btnUit = document.getElementById('btn-uit-map');
    const mapGoogle = document.getElementById('map-google');
    const mapUit = document.getElementById('map-uit');

    if (btnGoogle && btnUit && mapGoogle && mapUit) {
        

        btnGoogle.addEventListener('click', function() {
            // 1. Đổi trạng thái nút
            btnGoogle.classList.add('active');
            btnUit.classList.remove('active');
            

            mapGoogle.classList.remove('map-hidden');
            mapUit.classList.add('map-hidden');
        });

       
        btnUit.addEventListener('click', function() {

            btnUit.classList.add('active');
            btnGoogle.classList.remove('active');
            
            mapUit.classList.remove('map-hidden');
            mapGoogle.classList.add('map-hidden');
        });
    }
});