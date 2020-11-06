document.addEventListener('DOMContentLoaded', function () {
  var baseHost = document.location.origin;
  var streamUrl = baseHost + ':81';

  const hide = (el) => {
    el.classList.add('hidden');
  };

  const show = (el) => {
    el.classList.remove('hidden');
  };

  const disable = (el) => {
    el.classList.add('disabled');
    el.disabled = true;
  };

  const enable = (el) => {
    el.classList.remove('disabled');
    el.disabled = false;
  };

  const toggleMenu = (el) => {
    el.classList.toggle('activeMenu');
  };

  const updateValue = (el, value, updateRemote) => {
    updateRemote = updateRemote == null ? true : updateRemote;

    let initialValue;

    if (el.type === 'checkbox') {
      initialValue = el.checked;
      value = !!value;
      el.checked = value;
    } else {
      initialValue = el.value;
      el.value = value;
    }

    if (updateRemote && initialValue !== value) {
      updateConfig(el);
    } else if (!updateRemote) {
      if (el.id === 'aec') {
        value ? hide(exposure) : show(exposure);
      } else if (el.id === 'agc') {
        if (value) {
          show(gainCeiling);
          hide(agcGain);
        } else {
          hide(gainCeiling);
          show(agcGain);
        }
      } else if (el.id === 'awb_gain') {
        value ? show(wb) : hide(wb);
      } else if (el.id === 'face_recognize') {
        value ? enable(enrollButton) : disable(enrollButton);
      }
    }
  };

  function updateConfig(el) {
    let value;

    switch (el.type) {
      case 'checkbox':
        value = el.checked ? 1 : 0;
        break;
      case 'range':
      case 'select-one':
        value = el.value;
        break;
      case 'button':
      case 'submit':
        value = '1';
        break;
      default:
        return;
    }

    const query = `${baseHost}/control?var=${el.id}&val=${value}`;

    fetch(query).then((response) => {
      console.log(`request to ${query} finished, status: ${response.status}`);
    });
  }

  document.querySelectorAll('.close').forEach((el) => {
    el.onclick = () => {
      hide(el.parentNode);
    };
  });

  // read initial values
  fetch(`${baseHost}/status`)
    .then(function (response) {
      return response.json();
    })
    .then(function (state) {
      document.querySelectorAll('.default-action').forEach((el) => {
        updateValue(el, state[el.id], false);
      });
    });

  const content = document.getElementById('content'),
    view = document.getElementById('stream'),
    viewContainer = document.getElementById('stream-container'),
    stillButton = document.getElementById('get-still'),
    streamButton = document.getElementById('toggle-stream'),
    enrollButton = document.getElementById('face_enroll'),
    closeButton = document.getElementById('close-stream'),
    toggleIcon = document.getElementById('nav-toggle');

  const stopStream = () => {
    window.stop();
    streamButton.innerHTML = 'Start Stream';
  };

  const startStream = () => {
    view.src = `${streamUrl}/stream`;
    show(viewContainer);
    streamButton.innerHTML = 'Stop Stream';
  };

  // Attach actions to buttons
  stillButton.onclick = () => {
    stopStream();
    view.src = `${baseHost}/capture?_cb=${Date.now()}`;
    show(viewContainer);
  };

  closeButton.onclick = () => {
    stopStream();
    hide(viewContainer);
  };

  streamButton.onclick = () => {
    const streamEnabled = streamButton.innerHTML === 'Stop Stream';
    if (streamEnabled) {
      stopStream();
    } else {
      startStream();
    }
  };

  enrollButton.onclick = () => {
    updateConfig(enrollButton);
  };

  toggleIcon.onclick = () => {
    toggleMenu(content);
    toggleMenu(toggleIcon);
  };

  // Attach default on change action
  document.querySelectorAll('.default-action').forEach((el) => {
    el.onchange = () => updateConfig(el);
  });

  // Custom actions
  // Gain
  const agc = document.getElementById('agc');
  const agcGain = document.getElementById('agc_gain-group');
  const gainCeiling = document.getElementById('gainceiling-group');
  agc.onchange = () => {
    updateConfig(agc);
    if (agc.checked) {
      show(gainCeiling);
      hide(agcGain);
    } else {
      hide(gainCeiling);
      show(agcGain);
    }
  };

  // Exposure
  const aec = document.getElementById('aec');
  const exposure = document.getElementById('aec_value-group');
  aec.onchange = () => {
    updateConfig(aec);
    aec.checked ? hide(exposure) : show(exposure);
  };

  // AWB
  const awb = document.getElementById('awb_gain');
  const wb = document.getElementById('wb_mode-group');
  awb.onchange = () => {
    updateConfig(awb);
    awb.checked ? show(wb) : hide(wb);
  };

  // Detection and framesize
  const detect = document.getElementById('face_detect');
  const recognize = document.getElementById('face_recognize');
  const framesize = document.getElementById('framesize');

  framesize.onchange = () => {
    updateConfig(framesize);
    if (framesize.value > 5) {
      updateValue(detect, false);
      updateValue(recognize, false);
    }
  };

  detect.onchange = () => {
    if (framesize.value > 5) {
      alert(
        'Please select CIF or lower resolution before enabling this feature!'
      );
      updateValue(detect, false);
      return;
    }
    updateConfig(detect);
    if (!detect.checked) {
      disable(enrollButton);
      updateValue(recognize, false);
    }
  };

  recognize.onchange = () => {
    if (framesize.value > 5) {
      alert(
        'Please select CIF or lower resolution before enabling this feature!'
      );
      updateValue(recognize, false);
      return;
    }
    updateConfig(recognize);
    if (recognize.checked) {
      enable(enrollButton);
      updateValue(detect, true);
    } else {
      disable(enrollButton);
    }
  };

  /**Joystick */
  const joystick = document.getElementById('joystick'),
    knob = document.getElementById('knob'),
    targetX = joystick.clientWidth / 2 - knob.clientWidth / 2,
    targetY = joystick.clientHeight / 2 - knob.clientHeight / 2,
    animate = gsap.timeline({ paused: true });

  animate.to(knob, {
    duration: 0.3,
    ease: 'elastic.out(1, 1)',
    x: targetX,
    y: targetY,
  });

  knob.style.webkitTransform = knob.style.transform = `translate(${targetX}px, ${targetY}px)`;

  updatePositionAttributes(knob, targetX, targetY);

  // target the "draggable" class
  interact('.draggable').draggable({
    inertia: false,
    // restrict the element within the parent rect
    modifiers: [
      interact.modifiers.restrict({
        restriction: 'parent',
        endOnly: false,
        elementRect: { top: 0, right: 1, bottom: 1, left: 0 },
      }),
    ],
    onmove: dragMoveListener,
    onend: dropAnimation,
  });

  function dropAnimation() {
    animate.restart();

    updatePositionAttributes(knob, targetX, targetY);
  }

  function dragMoveListener(event) {
    let target = event.target,
      // keep the dragged position in the data-x/data-y attributes
      x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
      y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // translate the element
    target.style.webkitTransform = target.style.transform = `translate(${x}px, ${y}px)`;
    updatePositionAttributes(target, x, y);

    // update angle value
    angleInBinary(y - joystick.clientHeight / 4, x - joystick.clientWidth / 4);
  }

  /**
   * Updates the element position attributes data-x, data-y
   *
   * @param {HTMLElement} element Element to be updated
   * @param {Number} x Value to set data-x
   * @param {Number} y Value to set data-y
   */
  function updatePositionAttributes(element, x, y) {
    element.setAttribute('data-x', x);
    element.setAttribute('data-y', y);
  }

  /**
   * Returns an angle value with range from 0-1023 (0°/360° - 360° Unit Circle)
   *
   * @param {Number} y The y-coordinate
   * @param {Number} x The x-coordinate
   * @returns {Number} A value ranging from 0-1023
   */
  function angleInBinary(y, x) {
    var angle = Math.atan2(y, x),
      knobAngle;

    Math.sign(angle) == -1
      ? (knobAngle = (-angle * 180) / Math.PI)
      : (knobAngle = 360 - (angle * 180) / Math.PI);

    knobAngle = Math.round((knobAngle * 1024) / 360);

    if (knobAngle == 1024) knobAngle = 0;
    return knobAngle;
  }
});
