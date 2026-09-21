import { ref } from 'vue';

// Estado global mantido fora da função para persistir entre componentes
const isOpen = ref(false);

export function useCommandMenu() {
	const toggle = () => {
		isOpen.value = !isOpen.value;
	};
	
	const open = () => {
		isOpen.value = true;
	};
	
	const close = () => {
		isOpen.value = false;
	};

	return { isOpen, toggle, open, close };
}