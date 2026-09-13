const CMS_BASE_URL = 'https://yan-cms.onrender.com';
const CMS_CONTENT_URL = `${CMS_BASE_URL}/api/public/site-content/essencia-da-beleza`;

const getValue = (source, paths) => {
	for (const path of paths) {
		const value = path.split('.').reduce((current, key) => current?.[key], source);
		if (value !== undefined && value !== null && value !== '') return value;
	}
	return undefined;
};

const resolveCmsUrl = (value) => {
	if (typeof value !== 'string' || !value.trim()) return value;
	if (value.startsWith('/')) return `${CMS_BASE_URL}${value}`;
	return value;
};

const setText = (element, value) => {
	if (typeof value === 'string' && value.trim()) element.textContent = value;
};

const setImage = (element, value) => {
	const url = resolveCmsUrl(value);
	if (typeof url === 'string' && url.trim()) element.src = url;
};

const applySiteContent = (payload) => {
	const content = payload?.data || payload?.content || payload?.site || payload;
 
	document.querySelectorAll('[data-cms-field]').forEach((element) => {
		const field = element.dataset.cmsField;
		const value = getValue(content, [field, field.replace(/^site\./, ''), `settings.${field}`]);
		if (element.tagName === 'IMG') setImage(element, value);
		else if (element.tagName === 'A' && field === 'contact.whatsapp') {
			const whatsapp = String(value || '');
			if (whatsapp) element.href = whatsapp.startsWith('http') ? whatsapp : `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
		} else setText(element, value);
	});

	const heroImage = getValue(content, ['hero.image', 'heroImage', 'image', 'images.hero']);
	if (heroImage) setImage(document.querySelector('.hero-image img'), heroImage);

	const logo = getValue(content, ['logo', 'site.logo', 'branding.logo']);
	if (logo) {
		const logoUrl = resolveCmsUrl(logo);
		if (/^(https?:|\/)/.test(String(logo))) {
			const logoLink = document.querySelector('.logo');
			const logoImage = document.createElement('img');
			logoImage.src = logoUrl;
			logoImage.alt = getValue(content, ['site.title', 'title']) || 'Logo';
			logoImage.className = 'cms-logo-image';
			logoImage.style.maxHeight = '58px';
			logoLink.prepend(logoImage);
		} else setText(document.querySelector('.logo h1'), logo);
	}

	const contact = getValue(content, ['contact', 'contacts']) || {};
	const contactFields = [
		['phone', 'Telefone'], ['telephone', 'Telefone'], ['email', 'E-mail'],
		['address', 'Endereço'], ['instagram', 'Instagram'], ['facebook', 'Facebook']
	];
	const details = contactFields
		.map(([key, label]) => [getValue(contact, [key]) ?? getValue(content, [key]), label])
		.filter(([value]) => value);
	if (details.length) {
		const footerContainer = document.querySelector('.footer-container');
		const detailsElement = document.createElement('div');
		detailsElement.className = 'cms-contact-details';
		details.forEach(([value, label]) => {
			const paragraph = document.createElement('p');
			const labelElement = document.createElement('strong');
			labelElement.textContent = `${label}: `;
			paragraph.append(labelElement, document.createTextNode(String(value)));
			detailsElement.append(paragraph);
		});
		footerContainer.append(detailsElement);
	}

	const services = getValue(content, ['services', 'servicos']);
	if (Array.isArray(services) && services.length) {
		const cards = document.querySelectorAll('.category-card');
		services.slice(0, cards.length).forEach((service, index) => {
			const card = cards[index];
			setText(card.querySelector('h3'), service.name || service.title || service.nome);
			setText(card.querySelector('p'), service.description || service.descricao);
			setImage(card.querySelector('img'), service.image || service.imageUrl || service.imagem);
			if (service.url || service.link) card.href = service.url || service.link;
		});
	}
};

const loadCmsContent = async () => {
	try {
		const response = await fetch(CMS_CONTENT_URL, { headers: { Accept: 'application/json' } });
		if (!response.ok) return;
		const payload = await response.json();
		applySiteContent(payload);
	} catch (error) {
		console.warn('Yan CMS no disponible; se conserva el contenido local.', error);
	}
};

const whatsappButton = document.querySelector('.whatsapp-float');
if (whatsappButton) {
	whatsappButton.addEventListener('click', (event) => {
		event.preventDefault();
		window.open(whatsappButton.href, '_blank', 'noopener,noreferrer');
	});
}

loadCmsContent();
