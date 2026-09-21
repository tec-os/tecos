<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useClickOutside } from '../../composables/useClickOutside';

const isOpen = ref(false);
const dropdownRef = ref(null);

const toggle = () => {
    isOpen.value = !isOpen.value;
};

const close = () => {
    isOpen.value = false;
};

// Fecha ao clicar fora
useClickOutside(dropdownRef, close);

// Fecha ao pressionar Esc
const handleKeydown = (e) => {
    if (e.key === 'Escape' && isOpen.value) {
        close();
    }
};

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
    <div ref="dropdownRef" class="relative inline-block text-left">
        <!-- Trigger (Botão ou Avatar) -->
        <div @click="toggle" class="cursor-pointer">
            <slot name="trigger" />
        </div>

        <!-- Conteúdo do Menu -->
        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
        >
            <div
                v-if="isOpen"
                class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md border border-border bg-background shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
                <div class="py-1" @click="close">
                    <slot name="content" />
                </div>
            </div>
        </Transition>
    </div>
</template>