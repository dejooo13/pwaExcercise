
var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(function () {
      console.log('Service worker registered!');
    })
    .catch(function(err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function(event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  if('serviceWorker' in navigator) {
    const options = {
      body: 'You successfully subscribed to our notification service',
      icon: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sf-boat.jpg',
      dir: 'ltr',
      lang: 'en-US',
      vibrate: [100, 50, 200],
      badge: '/src/images/icons/app-icon-96x96.png',
      tag: 'confirm-notification',
      renotify: true,
      actions: [{
        action: 'confirm',
        title: 'OK',
        icon: '/src/images/icons/app-icon-96x96.png'
      }, {
        action: 'cancel',
        title: 'Cancel',
        icon: '/src/images/icons/app-icon-96x96.png'
      }]
    }
    
    navigator.serviceWorker.ready.then(sw => {
      sw.showNotification('Successfully subscribed!', options)
    })
  }
}

function configurePushSub() {
  if(!('serviceWorker' in navigator)) {
    return;
  } 

  let reg;

  navigator.serviceWorker.ready.then(sw => {
    reg = sw;
    return sw.pushManager.getSubscription();
  }).then(sub => {
    if(sub === null) {
      const vapidPublicKey = 'BLl7xIPAyJNzsMi5vo_aG-4RdXdyZ4Q4ZFpTgnm902qN79MIiSORBk9N-rfFEGiKNPuJu5SJmUX35Wwce9nuH94';
      var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidPublicKey
      })
    } else {

    }
  }).then(newSub => {
    return fetch('https://instapwa.firebaseio.com/subscriptions.json', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newSub)
    })
  }).then(res => {
    if(res.ok) {
      displayConfirmNotification()
    }
  }).catch(err => {
    console.log(err)
  })
}

function askForNotificationPermission() {
  Notification.requestPermission(result => {
    if(result !== 'granted') {
      console.log('User didnt grant permission')
    } else {
      configurePushSub()
      //displayConfirmNotification()
    }
  })
}

if('Notification' in window && 'serviceWorker' in navigator) {
  enableNotificationsButtons.forEach(btn => {
    btn.style.display = 'inline-block';
    btn.addEventListener('click', askForNotificationPermission)
  })
}