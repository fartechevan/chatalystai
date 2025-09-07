INSERT INTO knowledge_documents (
  id,
  title,
  content,
  file_type,
  file_path,
  chunking_method,
  user_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Chattalyst Complete Product Guide',
  '# Chattalyst - Complete Product Guide

## Overview
Chattalyst is an advanced AI-powered chatbot platform designed for sales and customer service automation. Our agentic AI chatbot provides human-like conversations that help businesses automate customer interactions, generate leads, and provide 24/7 support.

## Pricing Plans

### Starter Plan - $29/month
- Up to 1,000 conversations per month
- 1 AI agent
- Basic knowledge base (up to 10 documents)
- WhatsApp integration
- Email support
- Basic analytics dashboard
- Standard response time (under 2 seconds)

### Professional Plan - $79/month
- Up to 5,000 conversations per month
- 3 AI agents
- Advanced knowledge base (up to 100 documents)
- WhatsApp + Web chat integration
- Priority email support
- Advanced analytics and reporting
- Custom branding
- Appointment scheduling
- Lead capture forms

### Business Plan - $199/month
- Up to 15,000 conversations per month
- 10 AI agents
- Unlimited knowledge base documents
- All integrations (WhatsApp, Web, SMS, Email)
- Phone + email support
- Advanced AI training and customization
- Multi-language support
- CRM integrations
- Custom workflows
- API access

### Enterprise Plan - Custom pricing
- Unlimited conversations
- Unlimited AI agents
- White-label solution
- Dedicated account manager
- Custom integrations
- On-premise deployment options
- SLA guarantees
- Advanced security features
- Custom AI model training

## Key Features

### AI-Powered Conversations
- Natural language processing for human-like interactions
- Context-aware responses based on conversation history
- Sentiment analysis for better customer understanding
- Multi-turn conversation handling

### Knowledge Base Integration
- Upload documents, FAQs, and product information
- Automatic content chunking and vectorization
- Semantic search for relevant information retrieval
- Real-time knowledge updates

### Multi-Channel Support
- WhatsApp Business API integration
- Web chat widgets
- SMS messaging
- Email automation
- Social media platforms

### Lead Generation & Sales
- Automated lead qualification
- Appointment scheduling
- Product recommendations
- Sales funnel automation
- Follow-up sequences

### Analytics & Insights
- Conversation analytics
- Customer satisfaction metrics
- Lead conversion tracking
- Performance dashboards
- Custom reporting

### Integrations
- CRM systems (Salesforce, HubSpot, Pipedrive)
- Calendar applications (Google Calendar, Outlook)
- E-commerce platforms (Shopify, WooCommerce)
- Payment gateways
- Marketing automation tools

## Benefits

### For Businesses
- Reduce customer service costs by up to 80%
- Increase lead conversion rates by 35%
- Provide 24/7 customer support
- Scale customer interactions without hiring
- Improve response times to under 2 seconds
- Gather valuable customer insights

### For Customers
- Instant responses to inquiries
- Consistent service quality
- Available 24/7 across multiple channels
- Personalized interactions
- Quick problem resolution
- Seamless handoff to human agents when needed

## Frequently Asked Questions

### Pricing & Billing
**Q: Can I change my plan anytime?**
A: Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.

**Q: Is there a free trial?**
A: Yes, we offer a 14-day free trial with full access to Professional plan features.

**Q: What happens if I exceed my conversation limit?**
A: We''ll notify you when you reach 80% of your limit. You can upgrade your plan or purchase additional conversations.

### Features & Functionality
**Q: How accurate is the AI?**
A: Our AI achieves 95%+ accuracy in understanding customer intent and providing relevant responses.

**Q: Can the chatbot handle multiple languages?**
A: Yes, our AI supports 50+ languages with Business and Enterprise plans.

**Q: How quickly can I set up my chatbot?**
A: Most customers have their chatbot live within 24-48 hours of signing up.

## Contact Information

- **Sales:** sales@chattalyst.com
- **Support:** support@chattalyst.com
- **Phone:** +1 (555) 123-4567
- **Website:** https://chattalyst.com
- **Documentation:** https://docs.chattalyst.com',
  'markdown',
  '/chattalyst-comprehensive-guide.md',
  'semantic',
  (SELECT id FROM profiles LIMIT 1),
  NOW(),
  NOW()
);