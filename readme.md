# Generative AI Learning Project

A comprehensive TypeScript project demonstrating practical implementation of Generative AI concepts, Large Language Models (LLMs), and Retrieval-Augmented Generation (RAG) systems using LangChain framework.

## 🌟 Featured Project: Portfolio-Powered AI Assistant

**Built a production-ready RAG system trained on my portfolio** that enables recruiters to ask questions about my professional experience, skills, and projects. This interactive AI assistant demonstrates real-world application of GenAI concepts including vector embeddings, semantic search, and context-aware response generation.

👉 **Try it yourself**: Run `npm run raglcel` to start the interactive chat interface!

## 🎯 Project Overview

This repository showcases hands-on learning and implementation of modern AI/ML concepts including:
- **Prompt Engineering**: Creating effective prompts for LLM interactions
- **LangChain Framework**: Building AI applications using LangChain Expression Language (LCEL)
- **RAG Systems**: Implementing Retrieval-Augmented Generation for context-aware AI responses
- **Vector Embeddings**: Working with vector databases and semantic search
- **Multi-Model Integration**: Integrating OpenAI, Google Gemini, and Anthropic Claude models

## 🎨 What I Built

### **Portfolio-Powered AI Assistant for Recruiters**

As a practical application of the concepts learned, I built a **production-ready RAG (Retrieval-Augmented Generation) system** trained on my personal portfolio website. This interactive AI assistant allows recruiters and hiring managers to ask questions about my professional experience, skills, projects, and background.

**Key Features:**
- 🤖 **Interactive Chat Interface**: Terminal-based chat system where recruiters can ask questions about my experience
- 📚 **Portfolio Knowledge Base**: Automatically scraped and processed my entire portfolio website
- 🔍 **Semantic Search**: Uses vector embeddings to find the most relevant information from my portfolio
- 💬 **Context-Aware Responses**: Provides accurate, detailed answers based on my actual work experience
- ⚡ **Real-Time Streaming**: Responses stream in real-time for a smooth conversational experience

**How It Works:**
1. **Document Collection**: Web crawler automatically extracts all content from my portfolio website
2. **Text Processing**: Documents are intelligently chunked (1000 characters with 200 overlap) for optimal context retention
3. **Vectorization**: Each chunk is converted to embeddings using OpenAI's text-embedding-3-small model
4. **Storage**: Embeddings are stored in Pinecone vector database for fast semantic search
5. **Retrieval**: When a question is asked, the system finds the most relevant portfolio sections
6. **Generation**: GPT-4o-mini generates accurate responses using the retrieved context

**Example Interactions:**
- "What programming languages does Manish know?"
- "Tell me about Manish's experience with full-stack development"
- "What projects has Manish worked on?"
- "What are Manish's technical skills?"

This project demonstrates not just theoretical knowledge, but the ability to build **real-world, production-ready AI applications** that solve practical problems.

## 🚀 Technologies & Skills Demonstrated

### Core Technologies
- **TypeScript** - Type-safe JavaScript development
- **Node.js** - Server-side JavaScript runtime
- **LangChain v1.0** - Framework for building LLM applications
- **Vector Databases** - Pinecone for semantic search and storage
- **Web Scraping** - Cheerio for document extraction

### AI/ML Concepts Implemented
- **Prompt Templates**: Structured prompt creation and management
- **LLM Parameters**: Temperature, top-p, top-k, and token limits
- **Output Parsing**: JSON and string parsing from LLM responses
- **Streaming**: Real-time response streaming for better UX
- **Embeddings**: Text-to-vector conversion using OpenAI and Google models
- **Document Chunking**: Text splitting strategies for RAG
- **Retrieval Systems**: Semantic search and context retrieval

### AI Models Integrated
- **OpenAI**: GPT-4o-mini, text-embedding-3-small
- **Google Gemini**: gemini-2.5-flash, text-embedding-004
- **Anthropic Claude**: claude-3-5-sonnet (for prompt generation)

## 📁 Project Structure

```
src/
├── basicPromptTemplates.ts      # Basic prompt template examples
├── LcelChains.ts                # LangChain Expression Language chains
├── llmparameters.ts                 # LLM parameter tuning (temperature, top-p, etc.)
├── imageGenration.ts            # Image generation concepts (with model limitations)
└── rag/                        # RAG (Retrieval-Augmented Generation) implementation
    ├── chunking/               # Document processing
    │   ├── webcrawler.ts      # Web scraping for document collection
    │   ├── documentLoader.ts  # Document loading and processing
    │   └── chunking.ts         # Text chunking strategies
    ├── vectorization/          # Vector embedding and storage
    │   └── vector.ts          # Pinecone vector database integration
    ├── retriever/             # Semantic search
    │   └── retrive.ts        # Document retrieval system
    ├── augmentation/          # RAG pipeline
    │   └── raglcel.ts        # Complete RAG implementation with LCEL
    ├── openai/                # OpenAI embeddings
    └── gemini/                # Google Gemini embeddings
```

## 🎓 Key Learning Outcomes

### 1. Prompt Engineering
- Understanding prompt templates and variable interpolation
- Creating structured prompts for consistent LLM responses
- Implementing chat-based prompt templates

### 2. LangChain Expression Language (LCEL)
- Building composable chains using `.pipe()` method
- Creating reusable AI workflows
- Implementing streaming responses for real-time interactions

### 3. LLM Parameter Tuning
- **Temperature**: Controlling randomness (0.0 = deterministic, 1.0 = creative)
- **Top-p (Nucleus Sampling)**: Probability-based token selection
- **Top-k**: Fixed number of top tokens to consider
- **Max Tokens**: Limiting response length

### 4. Vector Embeddings & Semantic Search
- Converting text to high-dimensional vectors
- Storing embeddings in Pinecone vector database
- Implementing similarity search for document retrieval
- Understanding embedding dimensions (OpenAI: 1536, Google: 768)

### 5. RAG (Retrieval-Augmented Generation)
- **Document Processing**: Web scraping, loading, and chunking
- **Vectorization**: Creating embeddings from document chunks
- **Retrieval**: Finding relevant context using semantic search
- **Augmentation**: Combining retrieved context with user queries
- **Generation**: Producing context-aware AI responses

### 6. Production-Ready Features
- Error handling and graceful degradation
- Progress bars for long-running operations
- Streaming responses for better user experience
- Environment variable management
- Type-safe TypeScript implementation

## 🛠️ Setup & Installation

### Prerequisites
- Node.js >= 14.0.0
- npm >= 6.0.0
- TypeScript 5.9.3+

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd aitest

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys:
# OPENAI_API_KEY=your_key_here
# GOOGLE_API_KEY=your_key_here
# PINECONE_API_KEY=your_key_here
```

### Running Examples
```bash
# Basic prompt templates
npm run llmchain

# LangChain Expression Language chains
npm run lcelChains

# LLM parameter tuning
npm run llmparameters

# Vector embeddings (OpenAI)
npm run openAiVectorEmbedding

# Vector embeddings (Google Gemini)
npm run geminiVectorEmbedding

# Complete RAG pipeline - Portfolio Q&A System
# This is the main application: interactive chat trained on portfolio
npm run raglcel

# Document vectorization - Process portfolio and store in vector DB
npm run vectorization
```

### 🚀 Try the Portfolio Q&A System

To interact with the portfolio-trained AI assistant:

1. **First, vectorize your portfolio** (if not already done):
   ```bash
   npm run vectorization
   ```
   This will:
   - Scrape your portfolio website
   - Process and chunk the documents
   - Create vector embeddings
   - Store them in Pinecone

2. **Start the interactive chat**:
   ```bash
   npm run raglcel
   ```

3. **Ask questions about the portfolio**:
   - "What are my technical skills?"
   - "Tell me about my projects"
   - "What is my experience with [technology]?"
   - "What programming languages do I know?"

## 💡 Key Features Implemented

### 1. **Prompt Template System**
- Reusable prompt templates with variable substitution
- Support for multiple input variables
- Format validation and error handling

### 2. **LCEL Chains**
- Composable AI workflows using LangChain Expression Language
- Streaming support for real-time responses
- JSON output parsing for structured data

### 3. **RAG Pipeline - Portfolio Q&A System**
- **Document Collection**: Automated web scraping of portfolio website
- **Text Chunking**: Intelligent document splitting (1000 chars, 200 overlap) for optimal context
- **Vector Storage**: Pinecone integration with automatic index creation
- **Semantic Retrieval**: Context-aware document search using cosine similarity
- **Interactive Chat**: Terminal-based chat interface with real-time streaming responses
- **Portfolio Training**: Complete system trained on personal portfolio for recruiter Q&A

### 4. **Multi-Model Support**
- Seamless switching between OpenAI, Google, and Anthropic models
- Model-specific configuration and optimization
- Embedding model comparison and evaluation

## 🔧 Technical Implementation Details

### Vector Database Integration
- Automatic Pinecone index creation with proper dimensions
- Batch processing for efficient vector storage
- Serverless configuration on AWS

### Document Processing
- HTML parsing and extraction using Cheerio
- Recursive web crawling for comprehensive document collection
- Progress tracking for long-running operations

### Error Handling
- Comprehensive try-catch blocks
- Graceful error messages
- Type-safe error handling with TypeScript

## 📊 Project Statistics
- **Total Files**: 15+ TypeScript modules
- **Lines of Code**: 1000+ lines
- **AI Models Integrated**: 3 (OpenAI, Google, Anthropic)
- **Vector Dimensions Supported**: 768, 1536
- **Chunking Strategy**: Recursive character splitting with overlap
- **Portfolio Documents Processed**: Complete portfolio website scraped and vectorized
- **Vector Database**: Pinecone with automatic index management
- **Production Features**: Error handling, streaming, progress tracking, type safety

## 🎯 Use Cases Demonstrated

### Primary Use Case: Portfolio Q&A System
**Built a complete RAG system trained on my portfolio** that enables:
- Recruiters to ask questions about my professional experience
- Real-time answers based on my actual portfolio content
- Semantic search across all portfolio sections
- Context-aware responses that accurately represent my skills and experience

### Additional Use Cases
1. **Question-Answering System**: RAG-based Q&A with document context
2. **Document Search**: Semantic search across large document collections
3. **Interactive Chatbots**: Streaming chat interfaces with context awareness
4. **Embedding Comparison**: Evaluating different embedding models (OpenAI vs Google)
5. **Prompt Optimization**: Experimenting with different prompt structures for better responses

## 🔮 Future Enhancements
- [ ] Multi-modal support (images, audio)
- [ ] Advanced chunking strategies (semantic chunking)
- [ ] Conversation memory and history
- [ ] Evaluation metrics for RAG performance
- [ ] Web interface for interactive demos
- [ ] Support for additional vector databases

## 📚 Learning Resources
This project was built while learning from:
- LangChain official documentation
- OpenAI API documentation
- Google AI documentation
- Vector database best practices
- RAG system architecture patterns

## 🤝 Contributing
This is a learning project. Suggestions and improvements are welcome!

## 📝 License
MIT License - Feel free to use this project for learning and reference.

---

**Built with ❤️ to demonstrate practical GenAI implementation skills**
