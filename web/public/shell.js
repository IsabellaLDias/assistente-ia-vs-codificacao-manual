const views = ['cronometro', 'metricas', 'dashboard'];
function navigate() {
  const view = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'cronometro';
  for (const name of views) {
    document.getElementById(name).hidden = name !== view;
    const link = document.querySelector(`nav a[href="#${name}"]`);
    if (name === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const titles = {
    cronometro: 'Cronômetro',
    metricas: 'Métricas de código',
    dashboard: 'Dashboard Analítico'
  };
  document.title = `LAB02 · ${titles[view] || 'Experimento'}`;
}
window.addEventListener('hashchange', navigate);
navigate();
