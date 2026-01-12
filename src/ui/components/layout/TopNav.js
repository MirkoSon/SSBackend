/**
 * TopNav - Top navigation bar for admin interface
 * 
 * @component
 * @example
 * const nav = new TopNav({
 *   title: 'SSBackend Admin',
 *   links: [
 *     { label: 'Dashboard', href: '/' },
 *     { label: 'Plugins', href: '/plugins' }
 *   ]
 * });
 * const html = nav.render();
 * 
 * @param {Object} config - TopNav configuration
 * @param {string} config.title - Site title
 * @param {Array} config.links - Navigation links
 * @param {string} config.links[].label - Link text
 * @param {string} config.links[].href - Link URL
 * @returns {string} HTML string for the top navigation
 */
class TopNav {
  constructor(config) {
    this.config = config;
    this.element = null;
    this.mobileMenuOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    const mobileLinks = this.element.querySelector('.top-nav__mobile-links');
    const hamburgerBtn = this.element.querySelector('.top-nav__hamburger');
    if (this.mobileMenuOpen) {
      mobileLinks.style.display = 'flex';
      hamburgerBtn.classList.add('open');
    } else {
      mobileLinks.style.display = 'none';
      hamburgerBtn.classList.remove('open');
    }
  }

  render() {
    const linksHtml = this.config.links.map(link => 
      `<a href="${link.href}" class="top-nav__link">${link.label}</a>`
    ).join('');

    const nav = document.createElement('nav');
    nav.className = 'top-nav';
    nav.innerHTML = `
      <div class="top-nav__logo">${this.config.title}</div>
      <div class="top-nav__desktop-links">
        ${linksHtml}
      </div>
      <div class="top-nav__user-menu">
        <!-- User menu placeholder -->
      </div>
      <button class="top-nav__hamburger">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="top-nav__mobile-links" style="display: none;">
        ${linksHtml}
      </div>
    `;
    this.element = nav;
    this.addEventListeners();
    return this.element;
  }

  addEventListeners() {
    const hamburgerBtn = this.element.querySelector('.top-nav__hamburger');
    hamburgerBtn.addEventListener('click', this.toggleMobileMenu.bind(this));
  }
}

export default TopNav;
