document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.getElementById('fetch-button');
    const urlInput = document.getElementById('youtube-url');
    const infoDisplay = document.getElementById('info-display');
    const indicatorLight = document.querySelector('.indicator-light');
    const tabContainer = document.querySelector('.tab-container');
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const videoDownloadOptions = document.getElementById('video-download-options');
    const audioDownloadOptions = document.getElementById('audio-download-options');

    const API_URL = 'http://127.0.0.1:8000';
    let currentUrl = '';
    let videoFormats = {};
    let audioFormats = [];

    // Tab switching logic
    tabLinks.forEach(tab => {
        tab.addEventListener('click', () => {
            tabLinks.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    fetchButton.addEventListener('click', async () => {
        const youtubeUrl = urlInput.value.trim();
        if (!youtubeUrl) {
            alert('Por favor, pega una URL de YouTube.');
            return;
        }
        currentUrl = youtubeUrl;

        // Reset UI
        infoDisplay.style.display = 'block';
        infoDisplay.innerHTML = 'Obteniendo información...';
        videoDownloadOptions.innerHTML = '';
        audioDownloadOptions.innerHTML = '';
        indicatorLight.style.backgroundColor = '#FFDC00'; // Yellow

        try {
            const response = await fetch(`${API_URL}/info?url=${encodeURIComponent(youtubeUrl)}`);
            if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
            
            const data = await response.json();
            indicatorLight.style.backgroundColor = '#2ECC40'; // Green

            infoDisplay.innerHTML = `
                <p><strong>Título:</strong> ${data.title}</p>
                <img src="${data.thumbnail}" alt="thumbnail" style="max-width: 100%; border-radius: 4px;"/>
            `;

            processFormats(data.formats);
            populateVideoOptions();
            populateAudioOptions();

        } catch (error) {
            console.error('Error fetching video info:', error);
            infoDisplay.innerHTML = `<p style="color: red;">Error: No se pudo obtener la información.</p>`;
            indicatorLight.style.backgroundColor = '#FF4136'; // Red
        }
    });

    function processFormats(formats) {
        videoFormats = {};
        audioFormats = [];
        formats.forEach(f => {
            if (f.vcodec !== 'none' && f.resolution) {
                const resolution = f.resolution.split('x')[1] + 'p';
                if (!videoFormats[resolution]) videoFormats[resolution] = [];
                videoFormats[resolution].push(f);
            } else if (f.vcodec === 'none' && f.acodec !== 'none') {
                audioFormats.push(f);
            }
        });
        audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0));
    }

    function populateVideoOptions() {
        let videoHTML = '<div class="format-group"><h4>Calidad de Video</h4>';
        for (const res in videoFormats) {
            const format = videoFormats[res][0];
            const size = format.filesize ? `${(format.filesize / 1024 / 1024).toFixed(2)} MB` : 'N/A';
            videoHTML += `
                <label>
                    <input type="radio" name="video_format" value="${format.format_id}">
                    ${res} (${format.ext}) - ${size}
                </label>`;
        }
        videoHTML += '</div>';

        videoHTML += '<div class="format-group"><h4>Calidad de Audio (para combinar)</h4>';
        audioFormats.forEach(format => {
            const size = format.filesize ? `${(format.filesize / 1024 / 1024).toFixed(2)} MB` : 'N/A';
            const quality = format.abr ? `${Math.round(format.abr)}kbps` : (format.note || format.ext);
            videoHTML += `
                <label>
                    <input type="radio" name="audio_format_video" value="${format.format_id}">
                    ${quality} (${format.ext}) - ${size}
                </label>`;
        });
        videoHTML += '</div>';
        videoHTML += '<button id="download-video-btn" class="download-section-btn">Descargar Video con Audio</button>';
        videoDownloadOptions.innerHTML = videoHTML;

        document.getElementById('download-video-btn').addEventListener('click', handleVideoDownload);
    }

    function populateAudioOptions() {
        let audioHTML = '<div class="format-group"><h4>Calidad de Audio</h4>';
        audioFormats.forEach(format => {
            const size = format.filesize ? `${(format.filesize / 1024 / 1024).toFixed(2)} MB` : 'N/A';
            const quality = format.abr ? `${Math.round(format.abr)}kbps` : (format.note || format.ext);
            audioHTML += `
                <label>
                    <input type="radio" name="audio_format_standalone" value="${format.format_id}">
                    ${quality} (${format.ext}) - ${size}
                </label>`;
        });
        audioHTML += '</div>';
        audioHTML += '<button id="download-audio-btn" class="download-section-btn">Descargar Solo Audio</button>';
        audioDownloadOptions.innerHTML = audioHTML;

        document.getElementById('download-audio-btn').addEventListener('click', handleAudioDownload);
    }

    function handleVideoDownload() {
        const selectedVideo = document.querySelector('input[name="video_format"]:checked');
        const selectedAudio = document.querySelector('input[name="audio_format_video"]:checked');

        if (!selectedVideo) {
            alert('Por favor, selecciona una calidad de video.');
            return;
        }
        if (!selectedAudio) {
            alert('Por favor, selecciona una calidad de audio para combinar.');
            return;
        }

        const videoFormatId = selectedVideo.value;
        const audioFormatId = selectedAudio.value;
        const downloadUrl = `${API_URL}/download?url=${encodeURIComponent(currentUrl)}&video_format_id=${videoFormatId}&audio_format_id=${audioFormatId}`;
        
        triggerDownload(downloadUrl, this);
    }

    function handleAudioDownload() {
        const selectedAudio = document.querySelector('input[name="audio_format_standalone"]:checked');
        if (!selectedAudio) {
            alert('Por favor, selecciona una calidad de audio.');
            return;
        }

        const audioFormatId = selectedAudio.value;
        const downloadUrl = `${API_URL}/download?url=${encodeURIComponent(currentUrl)}&audio_format_id=${audioFormatId}`;

        triggerDownload(downloadUrl, this);
    }

    function triggerDownload(url, buttonElement) {
        const originalText = buttonElement.innerHTML;
        buttonElement.textContent = 'Descargando...';
        buttonElement.disabled = true;

        window.location.href = url;

        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
        }, 4000);
    }
});