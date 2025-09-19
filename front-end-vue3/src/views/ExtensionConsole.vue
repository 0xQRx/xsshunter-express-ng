<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card>
          <div class="card-header">
            <div class="row">
              <div class="col-6">
                <h1 class="card-title">Extension Console</h1>
              </div>
              <div class="col-6 text-right">
                <BaseButton @click="showNewExtensionModal" type="primary" size="sm">
                  <i class="fa fa-plus"></i> New Extension
                </BaseButton>
              </div>
            </div>
          </div>
          <div class="card-body">
            <!-- Extensions List -->
            <div v-if="extensions.length === 0" class="text-center text-muted">
              <p>No extensions created yet. Click "New Extension" to get started!</p>
            </div>
            
            <!-- Desktop Table View -->
            <div v-else class="table-wrapper d-none d-md-block">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th class="d-none d-lg-table-cell">Description</th>
                    <th>Status</th>
                    <th class="d-none d-xl-table-cell">Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="extension in extensions" :key="extension.id">
                    <td class="extension-name">{{ extension.name }}</td>
                    <td class="extension-description d-none d-lg-table-cell">{{ extension.description || 'No description' }}</td>
                    <td class="extension-status">
                      <span :class="['badge', extension.is_active ? 'badge-success' : 'badge-secondary']">
                        {{ extension.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="extension-date d-none d-xl-table-cell">{{ formatDate(extension.created_at) }}</td>
                    <td class="extension-actions">
                      <button @click="editExtension(extension)" class="btn btn-sm btn-info mr-1" title="Edit">
                        <i class="fa fa-edit"></i>
                      </button>
                      <button @click="toggleExtensionStatus(extension)" :class="['btn', 'btn-sm', 'mr-1', extension.is_active ? 'btn-warning' : 'btn-success']" :title="extension.is_active ? 'Deactivate' : 'Activate'">
                        <i :class="['fa', extension.is_active ? 'fa-pause' : 'fa-play']"></i>
                      </button>
                      <button @click="deleteExtension(extension)" class="btn btn-sm btn-danger" title="Delete">
                        <i class="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Mobile Card View -->
            <div v-if="extensions.length > 0" class="d-block d-md-none mobile-extension-list">
              <div v-for="extension in extensions" :key="extension.id" class="mobile-extension-card">
                <div class="card-header">
                  <h5 class="mb-0">{{ extension.name }}</h5>
                  <span :class="['badge', extension.is_active ? 'badge-success' : 'badge-secondary']">
                    {{ extension.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="card-body">
                  <p class="text-muted small mb-2" v-if="extension.description">
                    {{ extension.description }}
                  </p>
                  <p class="text-muted small mb-3">
                    <i class="fa fa-clock-o"></i> {{ formatDate(extension.created_at) }}
                  </p>
                  <div class="btn-group w-100" role="group">
                    <button @click="editExtension(extension)" class="btn btn-info" title="Edit">
                      <i class="fa fa-edit"></i>
                      <span class="d-none d-sm-inline"> Edit</span>
                    </button>
                    <button @click="toggleExtensionStatus(extension)" :class="['btn', extension.is_active ? 'btn-warning' : 'btn-success']" :title="extension.is_active ? 'Deactivate' : 'Activate'">
                      <i :class="['fa', extension.is_active ? 'fa-pause' : 'fa-play']"></i>
                      <span class="d-none d-sm-inline"> {{ extension.is_active ? 'Pause' : 'Play' }}</span>
                    </button>
                    <button @click="deleteExtension(extension)" class="btn btn-danger" title="Delete">
                      <i class="fa fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Edit/Create Extension Modal -->
    <Modal
      v-model="showModal"
      :show-close="false"
      :centered="true"
      :click-out="false"
      header-classes="justify-content-center"
      type=""
      modal-classes="modal-xl modal-black">
      <template #header>
        <h4 class="modal-title">{{ editingExtension ? 'Edit Extension' : 'New Extension' }}</h4>
      </template>
      
      <div class="form-group">
        <label>Name *</label>
        <BaseInput v-model="currentExtension.name" type="text" placeholder="My Custom Extension" />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="currentExtension.description" class="form-control" rows="2" placeholder="Brief description of what this extension does"></textarea>
      </div>
      
      <div class="form-group">
        <label>JavaScript Code *</label>
        <CodeEditor
          v-model="currentExtension.code"
          language="javascript"
          class="extension-code-editor"
        />
        <small class="form-text text-muted">
          This code will be executed when the XSS fires. You have access to all DOM APIs and the captured context.
        </small>
      </div>
      
      <div class="form-group">
        <div class="form-check">
          <label class="form-check-label">
            <input v-model="currentExtension.is_active" type="checkbox" class="form-check-input">
            <span class="form-check-sign"></span>
            <span>Activate this extension (will be executed on XSS fires)</span>
          </label>
        </div>
      </div>
      
      <template #footer>
        <BaseButton @click="closeModal" type="secondary">Cancel</BaseButton>
        <BaseButton @click="testCurrentExtension" type="info" :disabled="!currentExtension.code">
          <i class="fa fa-flask"></i> Test
        </BaseButton>
        <BaseButton @click="saveExtension" type="success" :disabled="!isValidExtension">
          <i class="fa fa-save"></i> {{ editingExtension ? 'Update' : 'Create' }}
        </BaseButton>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from '@/components/Cards/Card.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/Inputs/BaseInput.vue'
import Modal from '@/components/Modal.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import api_request from '@/services/api'
import { useToast } from '@/composables/useToast'

const { showSuccess, showError } = useToast()

// Data
const extensions = ref<any[]>([])
const showModal = ref(false)
const editingExtension = ref<any>(null)
const currentExtension = ref({
  name: '',
  description: '',
  code: '',
  is_active: false
})

// Computed
const isValidExtension = computed(() => {
  return currentExtension.value.name && currentExtension.value.code
})

// Methods
const loadExtensions = async () => {
  try {
    const response = await api_request.get_extensions()
    if (response.success) {
      extensions.value = response.extensions || []
    }
  } catch (error) {
    console.error('Failed to load extensions:', error)
    showError('Failed to load extensions')
  }
}

const showNewExtensionModal = () => {
  editingExtension.value = null
  currentExtension.value = {
    name: '',
    description: '',
    code: `// Example extension
console.log("XSS Fired at:", window.location.href);
console.log("Cookies:", document.cookie);

// Send additional data back to XSS Hunter
if (typeof fetch !== "undefined") {
  // Your custom data collection here
}`,
    is_active: false
  }
  showModal.value = true
}

const editExtension = (extension: any) => {
  editingExtension.value = extension
  currentExtension.value = {
    name: extension.name,
    description: extension.description,
    code: extension.code,
    is_active: extension.is_active
  }
  showModal.value = true
}

const saveExtension = async () => {
  try {
    let response
    if (editingExtension.value) {
      response = await api_request.update_extension(editingExtension.value.id, currentExtension.value)
    } else {
      response = await api_request.create_extension(currentExtension.value)
    }
    
    if (response.success) {
      showSuccess(
        editingExtension.value ? 'Extension updated successfully' : 'Extension created successfully'
      )
      await loadExtensions()
      closeModal()
    }
  } catch (error) {
    console.error('Failed to save extension:', error)
    showError('Failed to save extension')
  }
}

const testCurrentExtension = async () => {
  await testExtensionCode(currentExtension.value.code)
}

const testExtensionCode = async (code: string) => {
  // Show warning
  if (!confirm('Warning: This will open a popup window to test the extension. Continue?')) {
    return
  }
  
  try {
    // First, get a test token from the authenticated API
    const tokenData = await api_request.generate_test_token()

    if (!tokenData || !tokenData.token) {
      showError('Failed to generate test token. Please try again.')
      return
    }

    const testToken = tokenData.token

    // Open popup window first with specific settings
    const testWindow = window.open('about:blank', 'ExtensionTest', 'width=800,height=600,toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes')
    
    if (!testWindow) {
      showError('Popup blocked! Please allow popups for this site to test extensions.')
      return
    }
    
    // Create a form to POST the code to our test endpoint
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/test-payload'
    form.target = 'ExtensionTest'
    
    const codeInput = document.createElement('input')
    codeInput.type = 'hidden'
    codeInput.name = 'code'
    codeInput.value = code
    form.appendChild(codeInput)

    const tokenInput = document.createElement('input')
    tokenInput.type = 'hidden'
    tokenInput.name = 'test_token'
    tokenInput.value = testToken
    form.appendChild(tokenInput)
    
    // Submit form to the popup
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
    
    showSuccess('Extension test window opened. Check the popup for results.')
    
  } catch (error) {
    console.error('Failed to create test environment:', error)
    showError('Failed to create test environment')
  }
}

const toggleExtensionStatus = async (extension: any) => {
  try {
    const response = await api_request.update_extension(extension.id, {
      is_active: !extension.is_active
    })
    
    if (response.success) {
      showSuccess(
        extension.is_active ? 'Extension deactivated' : 'Extension activated'
      )
      await loadExtensions()
    }
  } catch (error) {
    console.error('Failed to toggle extension status:', error)
    showError('Failed to update extension status')
  }
}

const deleteExtension = async (extension: any) => {
  if (!confirm(`Are you sure you want to delete "${extension.name}"?`)) {
    return
  }
  
  try {
    const response = await api_request.delete_extension(extension.id)
    if (response.success) {
      showSuccess('Extension deleted successfully')
      await loadExtensions()
    }
  } catch (error) {
    console.error('Failed to delete extension:', error)
    showError('Failed to delete extension')
  }
}

const closeModal = () => {
  showModal.value = false
  editingExtension.value = null
  currentExtension.value = {
    name: '',
    description: '',
    code: '',
    is_active: false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Mounted
onMounted(async () => {
  await loadExtensions()
})
</script>

<style scoped lang="scss">
@import '@/assets/sass/mobile-responsive';
/* Custom modal sizes - make xl even larger */
:deep(.modal-xl) {
  max-width: 95%;
  width: 95%;
}

@media (min-width: 1200px) {
  :deep(.modal-xl) {
    max-width: 1140px;
  }
}

/* Make the code editor dynamically sized */
:deep(.modal-black .code-editor) {
  min-height: 400px;
  max-height: 60vh;
  resize: vertical;
  overflow-y: auto;
}

.extension-code-editor {
  :deep(.cm-editor) {
    min-height: 400px;
    max-height: 60vh;
  }
}

.form-control {
  background-color: #27293d;
  border: 1px solid #2b3553;
  color: rgba(255, 255, 255, 0.8);
  
  &:focus {
    background-color: #27293d;
    border-color: #e14eca;
    color: #ffffff;
    box-shadow: none;
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
}

.badge-success {
  background-color: #51cf66;
  color: #fff;
  padding: 0.25em 0.6em;
  border-radius: 0.25rem;
}

.badge-secondary {
  background-color: #868e96;
  color: #fff;
  padding: 0.25em 0.6em;
  border-radius: 0.25rem;
}

/* Prevent horizontal overflow */
.card-body {
  overflow-x: auto;
  overflow-y: visible;
  padding: 15px;
}

/* Table wrapper for responsive scrolling */
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

/* Table layout fixes for proper column sizing */
.table {
  table-layout: auto;
  width: 100%;
  min-width: 700px; /* Minimum width to prevent cramping */
}

/* Column width distribution */
.extension-name {
  min-width: 150px;
  max-width: 200px;
  word-wrap: break-word;
  white-space: normal;
}

.extension-description {
  min-width: 200px;
  word-wrap: break-word;
  white-space: normal;
  line-height: 1.4;
}

.extension-status {
  width: 100px;
  text-align: center;
  white-space: nowrap;
}

.extension-date {
  width: 140px;
  white-space: nowrap;
}

.extension-actions {
  width: 150px;
  white-space: nowrap;
  text-align: right;
}

/* Ensure buttons stay in a row */
.extension-actions button {
  display: inline-block;
  margin-right: 5px;
}

.extension-actions .btn {
  margin-right: 5px;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.extension-actions .btn:last-child {
  margin-right: 0;
}

/* Mobile extension card uses the mobile-card mixin from mobile-responsive */
.mobile-extension-card {
  @include mobile-card;
}

/* Apply responsive modal adjustments */
:deep(.modal) {
  @include responsive-modal;
}

/* Apply responsive table styles */
@include responsive-table;

/* Additional ExtensionConsole-specific mobile styles */
@media (max-width: $tablet) {
  .card-header h4 {
    font-size: 1.25rem;
  }
  
  .mobile-extension-card .btn-group .btn {
    padding: 0.5rem;
    
    span {
      display: none !important;
    }
    
    i {
      margin-right: 0;
    }
  }
}

.form-check {
  display: block;
  padding-left: 0;
  min-height: 1.5rem;
}

.form-check-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-bottom: 0;
  cursor: pointer;
  padding-left: 28px;
}

.form-check-input {
  position: absolute;
  left: 0;
  opacity: 0;
  cursor: pointer;
  height: 18px;
  width: 18px;
  
  &:checked + .form-check-sign::before {
    background-color: #e14eca;
    border-color: #e14eca;
  }
  
  &:checked + .form-check-sign::after {
    display: block;
  }
}

.form-check-sign {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 18px;
  width: 18px;
  
  &::before {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 18px;
    height: 18px;
    content: "";
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    transition: all 0.15s ease-in-out;
  }
  
  &::after {
    position: absolute;
    display: none;
    top: 3px;
    left: 6px;
    width: 6px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    content: "";
  }
}

/* Use mobile card mixin for extension cards */
.mobile-extension-card {
  @include mobile-card;
}

/* Apply responsive modal adjustments */
:deep(.modal) {
  @include responsive-modal;
}

/* Apply responsive table styles */
@include responsive-table;

/* Additional PayloadConsole-specific mobile styles */
@media (max-width: $tablet) {
  .card-header h4 {
    font-size: 1.25rem;
  }
  
  .btn-test-payloads {
    width: 100%;
    margin-top: 0.5rem;
  }
}
</style>