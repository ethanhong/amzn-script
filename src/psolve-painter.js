// eslint-disable-next-line no-unused-vars
function psolvePainter() {
  const deliveryDateSelector = '#wms_table_dwell_time > tbody:nth-child(2) > tr > td:nth-child(10)';

  // calulate window hour
  const currentTime = new Date();
  const lateWindow = (currentTime.getHours() + 1) % 12 || 12;
  const currentWindow = (currentTime.getHours() + 2) % 12 || 12;
  const nextWindow = (currentTime.getHours() + 3) % 12 || 12;

  document.querySelectorAll(deliveryDateSelector).forEach(cell => {
    let [startHour] = cell.textContent.match(/\d{1,2}(?=:00)/);
    startHour = parseInt(startHour, 10);
    if (startHour === lateWindow) {
      cell.classList.add('late-window');
    } else if (startHour === currentWindow) {
      cell.classList.add('current-window');
    } else if (startHour === nextWindow) {
      cell.classList.add('next-window');
    } else {
      cell.classList.add('future-window');
    }
  });

  addCSS();
}

function addCSS() {
  const styles = `
    .late-window {
      background-color: Red;
    }
    .current-window {
      background-color: Pink;
    }
    .next-window {
      background-color: SkyBlue;
    }
    .future-window {
      background-color: LightGrey;
    }
  `;
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
