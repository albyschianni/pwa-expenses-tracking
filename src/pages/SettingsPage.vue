<template>
  <div class="px-4 py-6">
    <!-- Export Success Toast -->
    <Transition name="fade">
      <div
        v-if="exportSuccess"
        class="bg-teal-500/15 border border-teal-500/30 rounded-xl p-3 mb-4 text-center"
      >
        <p class="text-teal-400 text-sm font-medium">Esportazione completata!</p>
        <p class="text-gray-400 text-xs mt-1">Il file CSV è stato scaricato.</p>
      </div>
    </Transition>

    <!-- Profile Card (clickable) -->
    <button
      @click="profileSheetOpen = true"
      class="w-full bg-gray-800 rounded-2xl p-4 mb-4 active:bg-gray-750 transition-colors text-left"
    >
      <div class="flex items-center gap-4">
        <img
          :src="displayAvatarUrl"
          alt="avatar"
          class="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
        />
        <div class="flex-1 min-w-0">
          <p class="text-white font-semibold text-lg truncate">
            {{ userName }}
          </p>
          <p class="text-gray-400 text-sm truncate">{{ userEmail }}</p>
          <p class="text-teal-400 text-xs mt-1">Modifica profilo</p>
        </div>
        <svg class="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>

    <!-- Bank Connections (feature-gated) -->
    <div v-if="bankingEnabled" class="mb-4">
      <BankConnectionsManager
        @add-connection="$emit('open-bank-connect')"
      />
    </div>

    <!-- Bank Transactions shortcut (feature-gated) -->
    <button
      v-if="bankingEnabled && hasConnections"
      @click="$emit('open-bank-transactions')"
      class="w-full bg-gray-800 rounded-2xl p-4 mb-4 flex items-center gap-4 active:bg-gray-700 transition-colors text-left"
    >
      <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
        <svg class="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <div class="flex-1">
        <p class="text-white font-medium">Transazioni bancarie</p>
        <p class="text-gray-400 text-sm">Visualizza e categorizza</p>
      </div>
      <span
        v-if="pendingReviewCount > 0"
        class="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold"
      >{{ pendingReviewCount > 9 ? '9+' : pendingReviewCount }}</span>
      <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <!-- Settings List -->
    <div class="bg-gray-800 rounded-2xl overflow-hidden mb-4">
      <!-- Categories -->
      <button @click="categoriesSheetOpen = true" class="w-full flex items-center gap-4 p-4 text-left border-b border-gray-700 active:bg-gray-700 transition-colors">
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Categorie</p>
          <p class="text-gray-400 text-sm">Gestisci e riordina le categorie</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Export -->
      <button @click="handleExport" class="w-full flex items-center gap-4 p-4 text-left border-b border-gray-700 active:bg-gray-700 transition-colors">
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Esporta transazioni</p>
          <p class="text-gray-400 text-sm">Scarica CSV di {{ displayMonthYear }}</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Export All Data (GDPR) -->
      <button @click="handleExportAllData" class="w-full flex items-center gap-4 p-4 text-left border-b border-gray-700 active:bg-gray-700 transition-colors">
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Esporta tutti i dati</p>
          <p class="text-gray-400 text-sm">Scarica tutti i tuoi dati in JSON (GDPR)</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Privacy Policy -->
      <button
        @click="privacySheetOpen = true"
        class="w-full flex items-center gap-4 p-4 text-left border-b border-gray-700 active:bg-gray-700 transition-colors"
      >
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Privacy Policy</p>
          <p class="text-gray-400 text-sm">Informativa sulla privacy e GDPR</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Currency -->
      <button
        @click="currencyPickerOpen = true"
        class="w-full flex items-center gap-4 p-4 text-left active:bg-gray-700 transition-colors"
      >
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Valuta</p>
          <p class="text-gray-400 text-sm">{{ currency.code }} ({{ currency.symbol }})</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Logout Button -->
    <button
      @click="handleLogout"
      :disabled="loading"
      class="w-full flex items-center justify-center gap-3 p-4 bg-gray-800 rounded-2xl text-red-400 font-semibold active:bg-gray-700 transition-colors"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {{ loading ? 'Uscita...' : 'Esci' }}
    </button>

    <!-- App Version -->
    <p class="text-center text-gray-600 text-sm mt-6">Expense Tracker v{{ appVersion }}</p>

    <!-- Categories Sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="categoriesSheetOpen"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="categoriesSheetOpen = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="categoriesSheetOpen"
          class="fixed inset-x-0 bottom-0 z-50 bg-gray-800 rounded-t-3xl max-h-[85vh] flex flex-col"
        >
          <div class="p-6 pb-0">
            <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-white text-lg font-semibold">Categorie</h3>
              <button
                @click="showAddCategoryForm = true"
                class="text-teal-400 text-sm font-medium active:text-teal-300 transition-colors"
              >
                + Aggiungi
              </button>
            </div>
            <!-- Type toggle -->
            <div class="flex bg-gray-700 rounded-xl p-1 mb-4">
              <button
                @click="catViewType = 'expense'"
                class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                :class="catViewType === 'expense' ? 'bg-gray-900 text-red-400 shadow' : 'text-gray-400'"
              >
                Spese
              </button>
              <button
                @click="catViewType = 'income'"
                class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                :class="catViewType === 'income' ? 'bg-gray-900 text-emerald-400 shadow' : 'text-gray-400'"
              >
                Entrate
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-8">
            <div class="space-y-1">
              <div
                v-for="cat in displayedManagedCategories"
                :key="cat.id"
                class="flex items-center gap-3 p-3 rounded-xl"
                :class="cat.isActive ? 'bg-gray-700/50' : 'bg-gray-800 opacity-40'"
              >
                <!-- Reorder buttons (all categories) -->
                <div class="flex flex-col gap-0.5">
                  <button
                    @click="reorderCategory(cat.id, 'up')"
                    class="w-6 h-6 flex items-center justify-center text-gray-500 active:text-white transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    @click="reorderCategory(cat.id, 'down')"
                    class="w-6 h-6 flex items-center justify-center text-gray-500 active:text-white transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <!-- Icon -->
                <span class="text-xl">{{ cat.icon }}</span>

                <!-- Label + system badge -->
                <div class="flex-1 min-w-0">
                  <p class="text-white text-sm font-medium truncate">{{ cat.label }}</p>
                  <p v-if="cat.isSystem" class="text-gray-500 text-xs">Sistema</p>
                </div>

                <!-- Edit button (custom categories only) -->
                <button
                  v-if="!cat.isSystem"
                  @click="startEditCategory(cat)"
                  class="w-8 h-8 flex items-center justify-center text-gray-400 active:text-white transition-colors shrink-0"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <!-- Color dot -->
                <div class="w-4 h-4 rounded-full shrink-0" :style="{ backgroundColor: cat.color }" />

                <!-- Enable/disable toggle (iOS-style) -->
                <button
                  @click="handleToggleCategory(cat.id, !cat.isActive)"
                  class="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
                  :class="cat.isActive ? 'bg-teal-400' : 'bg-gray-600'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                    :class="cat.isActive ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add/Edit Category Sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showAddCategoryForm"
          class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          @click="closeAddCategoryForm"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="showAddCategoryForm"
          class="fixed inset-x-0 bottom-0 z-[60] bg-gray-800 rounded-t-3xl p-6 pb-8"
        >
          <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
          <h3 class="text-white text-lg font-semibold mb-4">
            {{ editingCategoryId ? 'Modifica Categoria' : 'Nuova Categoria' }}
          </h3>

          <!-- Type selector -->
          <div v-if="!editingCategoryId" class="flex bg-gray-700 rounded-xl p-1 mb-4">
            <button
              @click="newCatForm.type = 'expense'"
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              :class="newCatForm.type === 'expense' ? 'bg-gray-900 text-red-400 shadow' : 'text-gray-400'"
            >
              Spesa
            </button>
            <button
              @click="newCatForm.type = 'income'"
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              :class="newCatForm.type === 'income' ? 'bg-gray-900 text-emerald-400 shadow' : 'text-gray-400'"
            >
              Entrata
            </button>
          </div>

          <!-- Name -->
          <div class="mb-4">
            <label class="block text-gray-400 text-sm mb-2">Nome</label>
            <input
              v-model="newCatForm.label"
              type="text"
              placeholder="Es: Viaggi"
              class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <!-- Icon (emoji text input) -->
          <div class="mb-4">
            <label class="block text-gray-400 text-sm mb-2">Icona (emoji dalla tastiera)</label>
            <div class="flex items-center gap-3">
              <input
                v-model="newCatForm.icon"
                type="text"
                placeholder="Es: 🏖️"
                class="w-20 bg-gray-700 text-white text-center text-2xl rounded-xl py-3 px-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                maxlength="4"
              />
              <span v-if="newCatForm.icon" class="text-3xl">{{ newCatForm.icon }}</span>
              <span v-else class="text-gray-500 text-sm">Inserisci un emoji dalla tastiera</span>
            </div>
          </div>

          <!-- Color picker -->
          <div class="mb-6">
            <label class="block text-gray-400 text-sm mb-2">Colore</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colorOptions"
                :key="color"
                @click="newCatForm.color = color"
                class="w-10 h-10 rounded-full transition-all"
                :class="newCatForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : ''"
                :style="{ backgroundColor: color }"
              />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-2">
            <button
              @click="closeAddCategoryForm"
              class="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium active:bg-gray-600 transition-colors"
            >
              Annulla
            </button>
            <button
              @click="handleSaveCategory"
              :disabled="!newCatForm.label.trim() || !newCatForm.icon || !newCatForm.color"
              class="flex-1 py-3 bg-teal-400 text-gray-900 rounded-xl font-semibold active:bg-teal-500 transition-colors disabled:opacity-40"
            >
              {{ editingCategoryId ? 'Salva' : 'Crea' }}
            </button>
          </div>

          <!-- Delete button (only when editing a custom category) -->
          <button
            v-if="editingCategoryId"
            @click="handleDeleteCategory(editingCategoryId!)"
            class="w-full mt-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-semibold active:bg-red-500/20 transition-colors text-center"
          >
            Elimina categoria
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Currency Picker Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="currencyPickerOpen"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="currencyPickerOpen = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="currencyPickerOpen"
          class="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 rounded-t-3xl p-6 pb-8"
        >
          <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
          <h3 class="text-white text-lg font-semibold mb-4">Seleziona valuta</h3>

          <div class="space-y-2">
            <button
              v-for="curr in availableCurrencies"
              :key="curr.code"
              @click="selectCurrency(curr.code)"
              class="w-full flex items-center gap-4 p-4 rounded-xl transition-colors"
              :class="currentCurrency === curr.code ? 'bg-teal-500/20 border border-teal-500' : 'bg-gray-700 active:bg-gray-600'"
            >
              <span class="text-2xl w-8 text-center">{{ curr.symbol }}</span>
              <div class="flex-1 text-left">
                <p class="text-white font-medium">{{ curr.name }}</p>
                <p class="text-gray-400 text-sm">{{ curr.code }}</p>
              </div>
              <svg
                v-if="currentCurrency === curr.code"
                class="w-6 h-6 text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Profile Sheet Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="profileSheetOpen"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="profileSheetOpen = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="profileSheetOpen"
          class="fixed inset-x-0 bottom-0 z-50 bg-gray-800 rounded-t-3xl max-h-[85vh] flex flex-col"
        >
          <div class="p-6 pb-0">
            <!-- Handle + Header -->
            <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-white text-xl font-bold">Profilo</h3>
              <button
                @click="profileSheetOpen = false"
                class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
              >
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-8">
            <!-- Avatar -->
            <div class="flex flex-col items-center mb-8">
              <button
                @click="triggerAvatarUpload"
                class="relative group"
              >
                <img
                  :src="displayAvatarUrl"
                  alt="avatar"
                  class="w-24 h-24 rounded-full object-cover border-3 border-gray-600"
                />
                <div class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                  <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <input
                ref="avatarFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="handleAvatarChange"
              />
              <p class="text-gray-400 text-xs mt-2">Tocca per cambiare foto</p>
            </div>

            <!-- Display Name -->
            <div class="mb-5">
              <label class="block text-gray-400 text-sm mb-2">Nome</label>
              <input
                v-model="profileForm.displayName"
                type="text"
                placeholder="Il tuo nome"
                @blur="saveDisplayName"
                class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <!-- Email -->
            <div class="mb-5">
              <label class="block text-gray-400 text-sm mb-2">Email</label>
              <div v-if="!emailEditMode" class="flex gap-2">
                <div class="flex-1 bg-gray-700/50 text-gray-300 rounded-xl py-3 px-4 truncate">
                  {{ userEmail }}
                </div>
                <button
                  @click="emailEditMode = true; profileForm.newEmail = ''"
                  class="px-4 bg-gray-700 text-teal-400 rounded-xl font-medium active:bg-gray-600 transition-colors"
                >
                  Cambia
                </button>
              </div>
              <div v-else class="space-y-3">
                <input
                  v-model="profileForm.newEmail"
                  type="email"
                  inputmode="email"
                  placeholder="Nuova email"
                  class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <div class="flex gap-2">
                  <button
                    @click="emailEditMode = false; profileForm.newEmail = ''"
                    class="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium active:bg-gray-600 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    @click="saveEmail"
                    :disabled="!profileForm.newEmail.includes('@')"
                    class="flex-1 py-3 bg-teal-400 text-gray-900 rounded-xl font-semibold active:bg-teal-500 transition-colors disabled:opacity-40"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>

            <!-- Password Section -->
            <div class="mb-5">
              <label class="block text-gray-400 text-sm mb-2">Password</label>
              <div v-if="!passwordEditMode" class="flex gap-2">
                <div class="flex-1 bg-gray-700/50 text-gray-500 rounded-xl py-3 px-4">
                  ••••••••
                </div>
                <button
                  @click="passwordEditMode = true"
                  class="px-4 bg-gray-700 text-teal-400 rounded-xl font-medium active:bg-gray-600 transition-colors"
                >
                  Cambia
                </button>
              </div>

              <div v-else class="space-y-3">
                <input
                  v-model="profileForm.newPassword"
                  type="password"
                  placeholder="Nuova password"
                  class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <input
                  v-model="profileForm.confirmPassword"
                  type="password"
                  placeholder="Conferma password"
                  class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <div class="flex gap-2">
                  <button
                    @click="cancelPasswordEdit"
                    class="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium active:bg-gray-600 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    @click="savePassword"
                    :disabled="!isPasswordValid"
                    class="flex-1 py-3 bg-teal-400 text-gray-900 rounded-xl font-semibold active:bg-teal-500 transition-colors disabled:opacity-40"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>

            <!-- Feedback Toast -->
            <Transition name="fade">
              <div
                v-if="feedbackMessage"
                class="rounded-xl p-3 text-center text-sm font-medium mb-4"
                :class="feedbackType === 'success' ? 'bg-teal-500/20 text-teal-400' : 'bg-red-500/20 text-red-400'"
              >
                {{ feedbackMessage }}
              </div>
            </Transition>

            <!-- Account Info -->
            <div class="mt-4 pt-4 border-t border-gray-700">
              <p class="text-gray-500 text-xs text-center">
                Account creato il {{ accountCreatedDate }}
              </p>
            </div>

            <!-- Danger Zone -->
            <div class="mt-6 pt-5 border-t border-gray-700">
              <p class="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">Zona pericolosa</p>
              <button
                @click="showDeleteConfirm = true"
                class="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 font-semibold active:bg-red-500/20 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Elimina account
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Delete Account Confirmation -->
      <Transition name="fade">
        <div
          v-if="showDeleteConfirm"
          class="fixed inset-0 z-[60] bg-black/70 flex items-end"
          @click.self="showDeleteConfirm = false"
        >
          <div class="w-full bg-gray-800 rounded-t-3xl p-6 pb-10">
            <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            <div class="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p class="text-white text-lg font-bold text-center mb-2">Eliminare l'account?</p>
            <p class="text-gray-400 text-sm text-center mb-6">
              Tutti i tuoi dati (transazioni, ricorrenti, impostazioni) verranno eliminati definitivamente. Questa azione è irreversibile.
            </p>
            <div class="space-y-2">
              <button
                @click="handleDeleteAccount"
                :disabled="deletingAccount"
                class="w-full p-4 rounded-xl bg-red-500 text-white font-bold active:bg-red-600 transition-colors disabled:opacity-50"
              >
                {{ deletingAccount ? 'Eliminazione...' : 'Sì, elimina il mio account' }}
              </button>
              <button
                @click="showDeleteConfirm = false"
                class="w-full p-4 rounded-xl bg-gray-700 text-white font-semibold active:bg-gray-600 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Privacy Policy Sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="privacySheetOpen"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="privacySheetOpen = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="privacySheetOpen"
          class="fixed inset-x-0 bottom-0 z-50 bg-gray-800 rounded-t-3xl max-h-[85vh] flex flex-col"
        >
          <div class="p-6 pb-0">
            <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white text-xl font-bold">Privacy Policy</h3>
              <button
                @click="privacySheetOpen = false"
                class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
              >
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-10 space-y-5 text-gray-300 text-sm leading-relaxed">
            <!-- Language toggle -->
            <div class="flex bg-gray-700 rounded-xl p-1">
              <button
                @click="privacyLang = 'it'"
                class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                :class="privacyLang === 'it' ? 'bg-gray-900 text-teal-400 shadow' : 'text-gray-400'"
              >
                Italiano
              </button>
              <button
                @click="privacyLang = 'en'"
                class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                :class="privacyLang === 'en' ? 'bg-gray-900 text-teal-400 shadow' : 'text-gray-400'"
              >
                English
              </button>
            </div>

            <p class="text-gray-500 text-xs">{{ privacyLang === 'it' ? 'Ultimo aggiornamento: marzo 2026' : 'Last updated: March 2026' }}</p>

            <!-- Italian -->
            <template v-if="privacyLang === 'it'">
              <section>
                <h4 class="text-white font-semibold mb-1">1. Titolare del trattamento</h4>
                <p>SpaceWeb Labs, sviluppatore dell'applicazione Expense Tracker. Per qualsiasi richiesta: <span class="text-teal-400">support@expensetracker.app</span></p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">2. Dati raccolti</h4>
                <p>L'app raccoglie esclusivamente i dati che inserisci volontariamente:</p>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li>Indirizzo email e password (per autenticazione)</li>
                  <li>Transazioni finanziarie (importo, descrizione, categoria, data)</li>
                  <li>Transazioni ricorrenti configurate</li>
                  <li>Categorie personalizzate</li>
                  <li>Dati portafogli condivisi e appartenenze</li>
                  <li>Foto profilo (opzionale)</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">3. Finalità del trattamento</h4>
                <p>I dati sono trattati esclusivamente per fornire il servizio: autenticazione, archiviazione e visualizzazione delle transazioni personali e condivise. Non vengono usati per profilazione, marketing o ceduti a terzi.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">4. Base giuridica</h4>
                <p>Il trattamento si basa sull'esecuzione del contratto di servizio (Art. 6, par. 1, lett. b GDPR) per le funzionalità principali, e sul consenso dell'utente (Art. 6, par. 1, lett. a GDPR) per funzionalità opzionali (es. analytics, se attivati in futuro).</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">5. Dove sono conservati i dati</h4>
                <p>I dati sono conservati sui server di Supabase (infrastruttura AWS, <strong>regione EU eu-central-1</strong>). I dati non vengono trasferiti al di fuori dell'UE.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">6. Misure di sicurezza</h4>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li>Crittografia in transito: TLS 1.2+</li>
                  <li>Crittografia a riposo: AES-256</li>
                  <li>Accesso ai dati limitato tramite Row Level Security (RLS)</li>
                  <li>Password hashate con bcrypt (mai in chiaro)</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">7. Conservazione dei dati</h4>
                <p>I dati sono conservati finché l'account è attivo. All'eliminazione dell'account, tutti i dati vengono cancellati definitivamente entro 30 giorni.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">8. Responsabili del trattamento</h4>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li>Supabase Inc. (database, autenticazione, storage)</li>
                  <li>Vercel Inc. (hosting frontend, solo file statici)</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">9. I tuoi diritti (GDPR / nLPD)</h4>
                <p>Hai diritto a:</p>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li><strong>Accesso</strong>: l'app mostra tutti i tuoi dati direttamente</li>
                  <li><strong>Portabilità</strong>: esporta tutti i dati in JSON o CSV dalle Impostazioni</li>
                  <li><strong>Rettifica</strong>: modifica transazioni e profilo direttamente nell'app</li>
                  <li><strong>Cancellazione</strong>: elimina l'account dalle Impostazioni (irreversibile)</li>
                  <li><strong>Opposizione</strong>: contattaci via email</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">10. Privacy by Design e by Default (nLPD)</h4>
                <p>L'app raccoglie solo i dati strettamente necessari al funzionamento del servizio. Non vengono attivati analytics o tracciamenti per impostazione predefinita. L'utente ha il pieno controllo dei propri dati.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">11. Cookie e tracker</h4>
                <p>L'app non utilizza cookie di tracciamento, strumenti di analytics o pubblicità.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">12. Contatti</h4>
                <p>SpaceWeb Labs — <span class="text-teal-400">support@expensetracker.app</span></p>
              </section>
            </template>

            <!-- English -->
            <template v-else>
              <section>
                <h4 class="text-white font-semibold mb-1">1. Data Controller</h4>
                <p>SpaceWeb Labs, developer of the Expense Tracker app. For any request: <span class="text-teal-400">support@expensetracker.app</span></p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">2. Data Collected</h4>
                <p>The app only collects data you voluntarily provide:</p>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li>Email address and password (for authentication)</li>
                  <li>Financial transactions (amount, description, category, date)</li>
                  <li>Recurring transaction configurations</li>
                  <li>Custom categories</li>
                  <li>Shared wallet data and memberships</li>
                  <li>Profile picture (optional)</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">3. Purpose of Processing</h4>
                <p>Data is processed solely to provide the service: authentication, storage, and display of personal and shared transactions. Data is never used for profiling, marketing, or shared with third parties.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">4. Legal Basis</h4>
                <p>Processing is based on contract execution (GDPR Art. 6(1)(b)) for core features, and user consent (GDPR Art. 6(1)(a)) for optional features (e.g., analytics, if enabled in the future).</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">5. Data Storage Location</h4>
                <p>Data is stored on Supabase servers (AWS infrastructure, <strong>EU region eu-central-1</strong>). No data is transferred outside the EU.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">6. Security Measures</h4>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li>Encryption in transit: TLS 1.2+</li>
                  <li>Encryption at rest: AES-256</li>
                  <li>Data access restricted via Row Level Security (RLS)</li>
                  <li>Passwords hashed with bcrypt (never stored in plaintext)</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">7. Data Retention</h4>
                <p>Data is retained as long as the account is active. Upon account deletion, all data is permanently removed within 30 days.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">8. Third-party Processors</h4>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li>Supabase Inc. (database, authentication, storage)</li>
                  <li>Vercel Inc. (frontend hosting, static files only)</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">9. Your Rights (GDPR / nLPD)</h4>
                <p>You have the right to:</p>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                  <li><strong>Access</strong>: the app displays all your data directly</li>
                  <li><strong>Portability</strong>: export all data as JSON or CSV from Settings</li>
                  <li><strong>Rectification</strong>: edit transactions and profile directly in-app</li>
                  <li><strong>Erasure</strong>: delete your account from Settings (irreversible)</li>
                  <li><strong>Objection</strong>: contact us via email</li>
                </ul>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">10. Privacy by Design & Default (nLPD)</h4>
                <p>The app only collects data strictly necessary for the service. No analytics or tracking is enabled by default. Users have full control over their data.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">11. Cookies & Trackers</h4>
                <p>The app does not use tracking cookies, analytics tools, or advertising.</p>
              </section>

              <section>
                <h4 class="text-white font-semibold mb-1">12. Contact</h4>
                <p>SpaceWeb Labs — <span class="text-teal-400">support@expensetracker.app</span></p>
              </section>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useCurrency } from '../composables/useCurrency'
import { useAvatar } from '../composables/useAvatar'
import { useExpenses } from '../composables/useExpenses'
import { supabase } from '../lib/supabase'
import { useCategories } from '../composables/useCategories'
import { useBanking } from '../composables/useBanking'
import { useSelectedMonth } from '../composables/useSelectedMonth'
import { APP_VERSION } from '../constants/version'
import BankConnectionsManager from '../components/BankConnectionsManager.vue'

const props = defineProps<{
  bankingEnabled: boolean
}>()

defineEmits<{
  'open-bank-connect': []
  'open-bank-transactions': []
}>()

const { user, signOut, loading, displayName, updateProfile, updatePassword, deleteAccount } = useAuth()
const { currency, availableCurrencies, setCurrency, currentCurrency } = useCurrency()
const { displayAvatarUrl, uploadAvatar } = useAvatar()
const { expenses, getCategoryConfig } = useExpenses()
const {
  managedExpenseCategories,
  managedIncomeCategories,
  reorderCategory,
  addCategory,
  updateCategory,
  deleteCategory,
} = useCategories()
const { hasConnections, pendingReviewCount } = useBanking()
const { displayMonthYear, monthKey } = useSelectedMonth()

const appVersion = APP_VERSION

const currencyPickerOpen = ref(false)
const profileSheetOpen = ref(false)
const categoriesSheetOpen = ref(false)
const privacySheetOpen = ref(false)
const privacyLang = ref<'it' | 'en'>('it')
const passwordEditMode = ref(false)
const emailEditMode = ref(false)

// ── Category management state ────────────────────────────────
const catViewType = ref<'expense' | 'income'>('expense')
const showAddCategoryForm = ref(false)
const editingCategoryId = ref<string | null>(null)

const newCatForm = reactive({
  label: '',
  icon: '',
  color: '#3B82F6',
  type: 'expense' as 'expense' | 'income',
})

const colorOptions = [
  '#EF4444', '#F59E0B', '#FBBF24', '#10B981', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F97316',
  '#14B8A6', '#6B7280', '#374151', '#A855F7',
]

const displayedManagedCategories = computed(() =>
  catViewType.value === 'expense' ? managedExpenseCategories.value : managedIncomeCategories.value
)

function startEditCategory(cat: any) {
  editingCategoryId.value = cat.id
  newCatForm.label = cat.label
  newCatForm.icon = cat.icon
  newCatForm.color = cat.color
  newCatForm.type = cat.type
  showAddCategoryForm.value = true
}

function closeAddCategoryForm() {
  showAddCategoryForm.value = false
  editingCategoryId.value = null
  newCatForm.label = ''
  newCatForm.icon = ''
  newCatForm.color = '#3B82F6'
  newCatForm.type = 'expense'
}

async function handleSaveCategory() {
  try {
    if (editingCategoryId.value) {
      await updateCategory(editingCategoryId.value, {
        label: newCatForm.label.trim(),
        icon: newCatForm.icon,
        color: newCatForm.color,
      })
      showFeedback('Categoria aggiornata', 'success')
    } else {
      await addCategory({
        label: newCatForm.label.trim(),
        icon: newCatForm.icon,
        color: newCatForm.color,
        type: newCatForm.type as 'expense' | 'income',
      })
      showFeedback('Categoria creata', 'success')
    }
    closeAddCategoryForm()
  } catch (e: any) {
    showFeedback(e.message || 'Errore nel salvataggio', 'error')
  }
}

async function handleDeleteCategory(id: string) {
  try {
    await deleteCategory(id)
    showFeedback('Categoria eliminata', 'success')
    closeAddCategoryForm()
  } catch (e: any) {
    showFeedback(e.message || 'Errore nell\'eliminazione', 'error')
  }
}

async function handleToggleCategory(id: string, active: boolean) {
  try {
    await updateCategory(id, { isActive: active })
    showFeedback(active ? 'Categoria abilitata' : 'Categoria disabilitata', 'success')
  } catch (e: any) {
    showFeedback(e.message || 'Errore nell\'aggiornamento', 'error')
  }
}
const showDeleteConfirm = ref(false)
const deletingAccount = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')
const avatarFileInput = ref<HTMLInputElement | null>(null)
const exportSuccess = ref(false)

const profileForm = reactive({
  displayName: '',
  newPassword: '',
  confirmPassword: '',
  newEmail: '',
})

// Sync form when profile sheet opens
watch(profileSheetOpen, (open) => {
  if (open) {
    profileForm.displayName = displayName.value || ''
    profileForm.newPassword = ''
    profileForm.confirmPassword = ''
    profileForm.newEmail = ''
    passwordEditMode.value = false
    emailEditMode.value = false
    showDeleteConfirm.value = false
    feedbackMessage.value = ''
  }
})

const userEmail = computed(() => user.value?.email || 'Utente')
const userName = computed(() => displayName.value || userEmail.value)

const isPasswordValid = computed(() => {
  return (
    profileForm.newPassword.length >= 6 &&
    profileForm.newPassword === profileForm.confirmPassword
  )
})

const accountCreatedDate = computed(() => {
  if (!user.value?.created_at) return ''
  return new Date(user.value.created_at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

// ── Export ────────────────────────────────────────────────────

function handleExport() {
  const list = expenses.value
  if (list.length === 0) {
    showFeedback('Nessuna transazione da esportare per questo mese', 'error')
    return
  }

  // Build CSV
  const header = 'Data,Tipo,Descrizione,Categoria,Importo,Fonte'
  const rows = [...list]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const cat = getCategoryConfig(e.category)
      const desc = e.description.replace(/"/g, '""')
      const catLabel = (cat.label as string).replace(/"/g, '""')
      const tipo = e.type === 'income' ? 'Entrata' : 'Spesa'
      const signedAmount = e.type === 'income' ? e.amount.toFixed(2) : (-e.amount).toFixed(2)
      const fonte = e.source === 'bank' ? 'Banca' : 'Manuale'
      return `${e.date},"${tipo}","${desc}","${catLabel}",${signedAmount},"${fonte}"`
    })

  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spese-${monthKey.value}.csv`
  a.click()
  URL.revokeObjectURL(url)

  exportSuccess.value = true
  setTimeout(() => {
    exportSuccess.value = false
  }, 3000)
}

// ── Full Data Export (GDPR) ───────────────────────────────────

async function handleExportAllData() {
  if (!user.value) return

  try {
    // Fetch all user data in parallel
    const [expensesRes, bankTxRes, recurringRes, categoriesRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('user_id', user.value.id).is('shared_wallet_id', null),
      supabase.from('bank_transactions').select('*'),
      supabase.from('recurring_expenses').select('*').eq('user_id', user.value.id),
      supabase.from('categories').select('*').eq('user_id', user.value.id),
    ])

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        email: user.value.email,
        displayName: user.value.user_metadata?.display_name || '',
        createdAt: user.value.created_at,
      },
      transactions: expensesRes.data || [],
      bankTransactions: bankTxRes.data || [],
      recurringTransactions: recurringRes.data || [],
      customCategories: categoriesRes.data || [],
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expense-tracker-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    showFeedback('Dati esportati con successo', 'success')
  } catch (e: any) {
    showFeedback('Errore nell\'esportazione dei dati', 'error')
    console.error('Export all data error:', e)
  }
}

// ── Currency ─────────────────────────────────────────────────

function selectCurrency(code: 'EUR' | 'USD' | 'GBP') {
  setCurrency(code)
  currencyPickerOpen.value = false
}

// ── Feedback ─────────────────────────────────────────────────

function showFeedback(message: string, type: 'success' | 'error') {
  feedbackMessage.value = message
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3000)
}

// ── Profile ──────────────────────────────────────────────────

async function saveDisplayName() {
  const trimmed = profileForm.displayName.trim()
  if (trimmed === displayName.value) return

  try {
    await updateProfile({ displayName: trimmed })
    showFeedback('Nome aggiornato', 'success')
  } catch (e) {
    showFeedback('Errore nell\'aggiornamento del nome', 'error')
  }
}

function cancelPasswordEdit() {
  passwordEditMode.value = false
  profileForm.newPassword = ''
  profileForm.confirmPassword = ''
}

async function saveEmail() {
  const newEmail = profileForm.newEmail.trim()
  if (!newEmail) return

  try {
    await updateProfile({ email: newEmail })
    showFeedback('Controlla la tua email per confermare il cambio', 'success')
    emailEditMode.value = false
    profileForm.newEmail = ''
  } catch (e) {
    showFeedback('Errore nel cambio email', 'error')
  }
}

async function savePassword() {
  if (!isPasswordValid.value) return

  try {
    await updatePassword(profileForm.newPassword)
    showFeedback('Password aggiornata', 'success')
    cancelPasswordEdit()
  } catch (e) {
    showFeedback('Errore nell\'aggiornamento della password', 'error')
  }
}

function triggerAvatarUpload() {
  avatarFileInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const success = await uploadAvatar(file)
  if (success) {
    showFeedback('Foto aggiornata', 'success')
  } else {
    showFeedback('Errore nel caricamento della foto', 'error')
  }

  // Reset input so same file can be selected again
  input.value = ''
}

async function handleDeleteAccount() {
  deletingAccount.value = true
  try {
    await deleteAccount()
  } catch (e) {
    deletingAccount.value = false
    showDeleteConfirm.value = false
    showFeedback('Errore durante l\'eliminazione dell\'account', 'error')
  }
}

async function handleLogout() {
  try {
    await signOut()
  } catch (e) {
    console.error('Logout failed:', e)
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
