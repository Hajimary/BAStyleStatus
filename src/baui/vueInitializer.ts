import { createApp } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from './app.vue';
import Diary from './日记.vue';
import RoleplayOptions from './选择框.vue';
import BaGal from './baGal.vue';
import SpriteGallery from './atlas/SpriteGallery.vue';
import { initializeBauiSettings } from './galgame/settings';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/日记', component: Diary },
    { path: '/选择框', component: RoleplayOptions },
    { path: '/baGal', component: BaGal },
    { path: '/spriteExample', component: BaGal },
    { path: '/sprites', component: SpriteGallery },
  ],
});
router.replace('/baGal');

$(async () => {
  // Initialize baui settings
  await initializeBauiSettings();

  createApp(App).use(router).mount('#app');
});
