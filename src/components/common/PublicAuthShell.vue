<script setup>
defineProps({
    eyebrow: { type: String, default: 'Gestão de assistência técnica' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
});
</script>

<template>
    <div class="grid min-h-screen w-full bg-[#f5f7f4] lg:grid-cols-[0.9fr_1.1fr]">
        <aside class="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full border-40 border-[#d6f36b]/10"></div>
            <div class="relative">
                <RouterLink to="/" class="flex items-center gap-3" aria-label="TecOS início">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6f36b] font-bold text-primary">T</span>
                    <span class="text-xl font-bold tracking-tight">Tec<span class="text-[#d26a45]">OS</span></span>
                </RouterLink>
                <div class="mt-24 max-w-md">
                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-[#d6f36b]">{{ eyebrow }}</p>
                    <h1 class="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">Menos ruído. Mais controle sobre cada serviço.</h1>
                    <p class="mt-6 text-base leading-7 text-[#c5d8cf]">Clientes, equipe, agenda e ordens de serviço em um fluxo que sua operação entende.</p>
                </div>
            </div>
            <div class="relative flex items-center gap-3 text-sm text-[#c5d8cf]"><span class="h-2 w-2 rounded-full bg-[#d6f36b]"></span> Ambiente protegido por empresa e perfil de acesso</div>
        </aside>
        <main class="flex min-h-screen items-center justify-center p-5 sm:p-8">
            <div class="w-full max-w-md">
                <div class="mb-8 flex items-center gap-3 lg:hidden">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-[#d6f36b]">T</span>
                    <span class="text-xl font-bold tracking-tight text-primary">Tec<span class="text-destructive">OS</span></span>
                </div>
                <div class="mb-8">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-destructive">{{ eyebrow }}</p>
                    <h2 class="mt-3 text-3xl font-bold tracking-tight text-primary">{{ title }}</h2>
                    <p v-if="description" class="mt-3 text-sm leading-6 text-muted-foreground">{{ description }}</p>
                </div>
                <slot />
            </div>
        </main>
    </div>
</template>
