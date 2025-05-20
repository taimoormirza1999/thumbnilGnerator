
// Toasts iziToast Helper
function Toast(type, title, message, positionToast) {
  iziToast.destroy();
    const toastOptions = {
      title: title,
      titleColor:'#fff',
      messageColor:'#fff',
      animateInside: true,
      message: message,
      close:false,
      position: positionToast ? positionToast : "bottomCenter",
      class: 'custom-toast-style'
    };
    switch (type) {
      case "info":
        iziToast.info({ ...toastOptions });
        break;
      case "success":
        iziToast.success({ 
          ...toastOptions,
          backgroundColor:'rgb(72 194 132)',
          iconUrl: 'https://res.cloudinary.com/da6qujoed/image/upload/v1747074574/CHECK_bdce7k.svg',
        });
        break;
      case "warning":
        iziToast.warning({ ...toastOptions });
        break;
      case "error":
        iziToast.error({ 
          ...toastOptions,
          backgroundColor:'#FF5D5D',
          iconUrl: 'https://res.cloudinary.com/da6qujoed/image/upload/v1747072549/lock_adxnjr.svg',
        });
        break;
      case "question":
        iziToast.question({
          ...toastOptions,
          timeout: 20000,
          close: false,
          overlay: true,
          displayMode: "once",
          position: "center",
          buttons: [
            [
              "<button><b>YES</b></button>",
              function (instance, toast) {
                instance.hide({ transitionOut: "fadeOut" }, toast, "button");
              },
              true,
            ],
            [
              "<button>NO</button>",
              function (instance, toast) {
                instance.hide({ transitionOut: "fadeOut" }, toast, "button");
              },
            ],
          ],
        });
        break;
      default:
        console.warn("Unknown toast type:", type);
    }
  }
  
  // Modern Confirmation Dialog
  function showConfirmDialog({ 
    title = 'Confirm',
    message = 'Are you sure?',
    position = 'center',
    titleColor = '#fff',
    messageColor = '#fff',
    backgroundColor = 'rgba(0, 0, 0, 0.9)',
    timeout = 0,
    buttons = {
      yes: { text: 'YES', style: 'background: #48C284; color: white; font-weight: 600; padding: 8px 20px; border-radius: 6px; margin-right: 10px;' },
      no: { text: 'NO', style: 'background: #FF5D5D; color: white; font-weight: 600; padding: 8px 20px; border-radius: 6px;' }
    },
    onYes = () => {},
    onNo = () => {}
  } = {}) {
    return new Promise((resolve) => {
      iziToast?.show({
        title: title,
        message: message,
        position: position,
        titleColor: titleColor,
        messageColor: messageColor,
        backgroundColor: backgroundColor,
        timeout: timeout,
        close: false,
        overlay: true,
        displayMode: 'once',
        class: 'custom-toast-style',
        buttons: [
          [
            `<button style="${buttons.yes.style}">${buttons.yes.text}</button>`,
            function (instance, toast) {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
              onYes();
              resolve(true);
            },
            true
          ],
          [
            `<button style="${buttons.no.style}">${buttons.no.text}</button>`,
            function (instance, toast) {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
              onNo();
              resolve(false);
            }
          ]
        ]
      });
    });
  }
  