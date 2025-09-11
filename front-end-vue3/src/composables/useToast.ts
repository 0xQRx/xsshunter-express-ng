declare global {
  interface Window {
    toastr: any;
  }
}

export function useToast() {
  const showSuccess = (message: string, title?: string) => {
    if (window.toastr) {
      window.toastr.success(message, title || 'Success')
    } else {
      console.log('Success:', title || 'Success', message)
    }
  }

  const showError = (message: string, title?: string) => {
    if (window.toastr) {
      window.toastr.error(message, title || 'Error')
    } else {
      console.error('Error:', title || 'Error', message)
    }
  }

  const showInfo = (message: string, title?: string) => {
    if (window.toastr) {
      window.toastr.info(message, title || 'Info')
    } else {
      console.info('Info:', title || 'Info', message)
    }
  }

  const showWarning = (message: string, title?: string) => {
    if (window.toastr) {
      window.toastr.warning(message, title || 'Warning')
    } else {
      console.warn('Warning:', title || 'Warning', message)
    }
  }

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning
  }
}