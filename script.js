const CMS_BASE_URL = 'https://yan-cms.onrender.com';
const CMS_CONTENT_URL = `${CMS_BASE_URL}/api/public/site-content/essencia-da-beleza`;
const CMS_ARTICLES_URL = `${CMS_BASE_URL}/api/public/articles/essencia-da-beleza`;

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

const getArticleSummary = (article) => {
	if (article.excerpt) return article.excerpt;
	return String(article.content || '').replace(/<[^>]*>/g, '').trim().slice(0, 150);
};

const createArticleModal = () => {
	const modal = document.createElement('div');
	modal.className = 'article-modal';
	modal.setAttribute('aria-hidden', 'true');
	modal.innerHTML = `
		<div class="article-modal-backdrop" data-modal-close></div>
		<article class="article-modal-content" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
			<button class="article-modal-close" type="button" aria-label="Fechar artigo" data-modal-close>&times;</button>
			<span class="article-category" id="article-modal-category"></span>
			<h2 id="article-modal-title"></h2>
			<div class="article-modal-body"></div>
		</article>
	`;
	document.body.append(modal);

	modal.addEventListener('click', (event) => {
		if (event.target.matches('[data-modal-close]')) {
			modal.classList.remove('is-open');
			modal.setAttribute('aria-hidden', 'true');
			document.body.classList.remove('modal-open');
		}
	});

	return modal;
};

const openArticleModal = (modal, article) => {
	modal.querySelector('#article-modal-category').textContent = article.category || 'Artigo';
	modal.querySelector('#article-modal-title').textContent = article.title || '';
	const body = modal.querySelector('.article-modal-body');
	const content = typeof article.content === 'string' ? article.content.replace(/\r\n?/g, '\n') : '';
	const paragraphs = content.split(/\n[ \t]*\n(?:[ \t]*\n)*/).filter((paragraph) => paragraph.trim());
	body.replaceChildren();

	if (!paragraphs.length) {
		const paragraph = document.createElement('p');
		paragraph.textContent = 'Este artigo não possui conteúdo.';
		body.append(paragraph);
	} else {
		paragraphs.forEach((paragraphText) => {
			const paragraph = document.createElement('p');
			paragraph.textContent = paragraphText;
			body.append(paragraph);
		});
	}
	modal.classList.add('is-open');
	modal.setAttribute('aria-hidden', 'false');
	document.body.classList.add('modal-open');
	modal.querySelector('.article-modal-close').focus();
};

const renderArticles = (articles) => {
	const container = document.querySelector('#articles-container');
	if (!container) return;
	const modal = createArticleModal();

	articles.filter((article) => article?.status === 'published').forEach((article) => {
		const card = document.createElement('article');
		card.className = 'article-card';

		const imageContainer = document.createElement('div');
		imageContainer.className = 'article-image';
		if (article.image) {
			const image = document.createElement('img');
			image.src = resolveCmsUrl(article.image);
			image.alt = article.title || 'Imagem do artigo';
			imageContainer.append(image);
		} else {
			const placeholder = document.createElement('span');
			placeholder.textContent = 'Imagem do artigo';
			imageContainer.append(placeholder);
		}

		const content = document.createElement('div');
		content.className = 'article-content';
		content.innerHTML = `
			<span class="article-category"></span>
			<h3></h3>
			<p></p>
			<a href="#" class="article-link">Ler artigo →</a>
		`;
		content.querySelector('.article-category').textContent = article.category || 'Artigo';
		content.querySelector('h3').textContent = article.title || 'Artigo sem título';
		content.querySelector('p').textContent = getArticleSummary(article);
		content.querySelector('.article-link').addEventListener('click', (event) => {
			event.preventDefault();
			openArticleModal(modal, article);
		});

		card.append(imageContainer, content);
		container.append(card);
	});
};

const loadArticles = async () => {
	try {
		const response = await fetch(CMS_ARTICLES_URL, { headers: { Accept: 'application/json' } });
		if (!response.ok) return;
		const payload = await response.json();
		const articles = Array.isArray(payload) ? payload : payload.value || payload.articles || payload.data || [];
		if (Array.isArray(articles)) renderArticles(articles);
	} catch (error) {
		console.warn('Yan CMS no disponible; se conserva el resto del sitio.', error);
	}
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
loadArticles();
