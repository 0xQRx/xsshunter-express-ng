<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card class="xss-card-container">
          <div class="card-content-wrapper">
            <div>
              <h1>
                <i class="fas fa-file"></i> Collected Pages
                ({{ formatWithCommas(pagesCount) }} Total)
              </h1>
              <div v-for="collectedPage in collectedPages" :key="collectedPage.id">
                <!-- Collected Page -->
                <Card>
                  <div>
                    <div>
                      <p class="report-section-label mr-2">
                        Collected Page URL: <code>{{ collectedPage.uri }}</code>
                      </p>
                    </div>
                    <div class="m-2 mt-4">
                      <CodeEditor
                        v-if="collectedPage.html && collectedPage.html.length < 10000"
                        :model-value="collectedPage.html"
                        :readonly="true"
                        language="html"
                        style="height: auto;"
                      />
                      <h4 v-else>
                        <i class="fas fa-exclamation-triangle"></i>
                        Page HTML too large to display inline, please use one of the options below.
                      </h4>
                      <div class="button-group-responsive">
                        <BaseButton
                          simple
                          type="primary"
                          class="mt-3 ml-1 mr-1 hide-mobile-text"
                          @click="viewHtmlInNewTab(collectedPage.html)"
                        >
                          <i class="fas fa-external-link-alt"></i> <span>Render Page in New Tab</span>
                        </BaseButton>
                        <BaseButton
                          simple
                          type="primary"
                          class="mt-3 ml-1 mr-1 hide-mobile-text"
                          @click="downloadHtml(collectedPage.html)"
                        >
                          <i class="fas fa-download"></i> <span>Download Raw HTML</span>
                        </BaseButton>
                        <BaseButton
                          simple
                          type="danger"
                          class="mt-3 ml-1 mr-1 hide-mobile-text"
                          @click="deleteCollectedPage(collectedPage.id)"
                        >
                          <i class="fas fa-trash-alt"></i> <span>Delete Page</span>
                        </BaseButton>
                      </div>
                    </div>
                    <hr />
                  </div>
                </Card>
              </div>
              <hr />
              <!-- Pagination -->
              <div class="text-center pagination-div">
                <BasePagination v-model="page" :page-count="totalPages" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
    
    <!-- Loading bar -->
    <div class="loading-bar" v-if="loading">
      <div class="progress">
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="100"
          class="progress-bar bg-primary-theme progress-bar-striped progress-bar-animated"
          style="width: 100%;"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import DOMPurify from 'dompurify'
import Card from '@/components/Cards/Card.vue'
import BaseButton from '@/components/BaseButton.vue'
import BasePagination from '@/components/BasePagination.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import api_request from '@/services/api'

// Data
const loading = ref(false)
const baseApiPath = ref('')
const page = ref(1)
const limit = 5
const collectedPages = ref<any[]>([])
const pagesCount = ref(0)

// Computed
const totalPages = computed(() => {
  return Math.ceil(pagesCount.value / limit)
})

// Methods
const formatWithCommas = (inputNumber: number) => {
  return inputNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const deleteCollectedPage = async (collectedPageId: string) => {
  await api_request.delete_collect_pages([collectedPageId])
  await pullCollectedPages()
}

const pullCollectedPages = async () => {
  loading.value = true
  try {
    const response = await api_request.get_collect_pages(page.value, limit)
    collectedPages.value = response.result.collected_pages
    pagesCount.value = response.result.total
  } catch (error) {
    console.error('Error fetching collected pages:', error)
    collectedPages.value = []
    pagesCount.value = 0
  } finally {
    loading.value = false
  }
}

const viewHtmlInNewTab = (inputHtml: string) => {
  const newWindow = window.open('about:blank', '_blank')
  if (newWindow) {
    // Sanitize HTML to prevent XSS attacks while preserving safe HTML structure
    const sanitizedHtml = DOMPurify.sanitize(inputHtml, {
      WHOLE_DOCUMENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      FORCE_BODY: false,
      ADD_TAGS: ['link', 'style'],
      ADD_ATTR: ['target', 'rel'],
      ALLOW_DATA_ATTR: true,
      ALLOW_UNKNOWN_PROTOCOLS: false
    })
    newWindow.document.write(sanitizedHtml)
    newWindow.document.close()
  }
}

const downloadHtml = (inputHtml: string) => {
  // Sanitize HTML before creating download link
  const sanitizedHtml = DOMPurify.sanitize(inputHtml, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,
    ADD_TAGS: ['link', 'style'],
    ADD_ATTR: ['target', 'rel'],
    ALLOW_DATA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false
  })
  const link = document.createElement('a')
  link.href = `data:text/html,${encodeURIComponent(sanitizedHtml)}`
  link.download = 'xss-page-contents.html'
  link.click()
}

// Watch
watch(page, async (newVal, oldVal) => {
  await pullCollectedPages()
  
  if (oldVal !== newVal) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  }
})

// Mounted
onMounted(async () => {
  // For debugging
  ;(window as any).app = {
    collectedPages,
    pagesCount,
    page,
    pullCollectedPages
  }

  // For rendering
  baseApiPath.value = api_request.BASE_API_PATH

  // Pull collected pages
  await pullCollectedPages()
})
</script>

<style scoped lang="scss">
@import '@/assets/sass/mobile-responsive';

.xss-card-container {
  max-width: 1000px;
  width: 100%;
}

.report-section-label {
  font-size: 18px;
  display: inline;
}

.pagination-div {
  width: 100%;
  display: flex;
  justify-content: center;
}

hr {
  background-color: #344675;
}

.loading-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 16px;
  right: 0;
  z-index: 10;
}

.progress-bar-animated {
  animation: progress-bar-stripes 1s linear infinite;
}

.progress-bar-striped {
  background-image: linear-gradient(45deg, hsla(0, 0%, 100%, .15) 25%, transparent 0, transparent 50%, hsla(0, 0%, 100%, .15) 0, hsla(0, 0%, 100%, .15) 75%, transparent 0, transparent);
  background-size: 1rem 1rem;
}

.progress-bar {
  flex-direction: column;
  justify-content: center;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  background-color: #007bff;
  transition: width .6s ease;
}

.progress,
.progress-bar {
  display: flex;
  overflow: hidden;
}

.progress {
  height: 1rem;
  line-height: 0;
  font-size: .75rem;
  background-color: #1b0036;
  border-radius: .25rem;
}

// Mobile responsiveness - additional styles specific to this view
@media (max-width: $tablet) {
  .report-section-label {
    font-size: 14px;
    
    code {
      word-break: break-all;
      display: block;
      margin-top: 0.5rem;
    }
  }
}
</style>