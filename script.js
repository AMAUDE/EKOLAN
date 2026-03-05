// Lecture forcée de la vidéo de fond (certains navigateurs)
const bgVideo = document.querySelector('.bg-video');
if (bgVideo) {
  bgVideo.play().catch(() => {});
}

// Micro-interactions pour la page d'accueil
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('mouseenter', () => {
    link.style.transform = 'translateY(-1px)';
  });
  link.addEventListener('mouseleave', () => {
    link.style.transform = '';
  });
});
