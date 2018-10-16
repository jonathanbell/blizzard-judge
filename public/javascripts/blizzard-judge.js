import '../sass/style.scss';

import SimpleLightbox from 'simple-lightbox';
import typeAhead from './modules/typeAhead';
import ajaxHeart from './modules/heart';

new SimpleLightbox({ elements: '.review-photos__grid a' });

typeAhead(document.querySelector('.search'));

const heartForms = document.querySelectorAll('form.heart');
heartForms.forEach(heartForm =>
  heartForm.addEventListener('submit', ajaxHeart)
);
