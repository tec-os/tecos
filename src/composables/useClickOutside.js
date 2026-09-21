import { onMounted, onUnmounted } from 'vue';

export function useClickOutside(elementRef, callback) {
    const handler = (event) => {
        if (elementRef.value && !elementRef.value.contains(event.target)) {
            callback();
        }
    };

    onMounted(() => {
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler); // Suporte para mobile
    });

    onUnmounted(() => {
        document.removeEventListener('mousedown', handler);
        document.removeEventListener('touchstart', handler);
    });
}