--
-- PostgreSQL database dump
--

\restrict BeWLaoahIptlefO2uZRyDtE6WC0HJEUrNU9WQtM5lmLD92QSqu1iGLebG65EYkR

-- Dumped from database version 16.10
-- Dumped by pg_dump version 18.0

-- Started on 2025-10-14 17:29:16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 33901)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 4991 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 42239)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 45801)
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    post_id integer,
    user_id integer,
    parent_comment_id integer,
    content text NOT NULL,
    evidence_url text,
    evidence_type character varying(20),
    file_size integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 45800)
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO postgres;

--
-- TOC entry 4992 (class 0 OID 0)
-- Dependencies: 226
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- TOC entry 233 (class 1259 OID 45859)
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    subject character varying(200) NOT NULL,
    message text NOT NULL,
    is_resolved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 45858)
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

--
-- TOC entry 4993 (class 0 OID 0)
-- Dependencies: 232
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 218 (class 1259 OID 42248)
-- Name: denonciations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.denonciations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    category_id uuid,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    location jsonb,
    is_anonymous boolean DEFAULT false,
    status character varying(50) DEFAULT 'pending'::character varying,
    evidence_files jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.denonciations OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 45765)
-- Name: denunciation_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.denunciation_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#3498db'::character varying
);


ALTER TABLE public.denunciation_types OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 45764)
-- Name: denunciation_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.denunciation_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.denunciation_types_id_seq OWNER TO postgres;

--
-- TOC entry 4994 (class 0 OID 0)
-- Dependencies: 222
-- Name: denunciation_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.denunciation_types_id_seq OWNED BY public.denunciation_types.id;


--
-- TOC entry 219 (class 1259 OID 42290)
-- Name: media_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    denonciation_id uuid,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.media_files OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 45777)
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    user_id integer,
    type_id integer,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    evidence_url text NOT NULL,
    evidence_type character varying(20) NOT NULL,
    file_size integer,
    latitude numeric(10,8),
    longitude numeric(11,8),
    location_name character varying(100),
    city character varying(50),
    province character varying(50),
    is_verified boolean DEFAULT false,
    is_approved boolean DEFAULT true,
    view_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 45776)
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- TOC entry 4995 (class 0 OID 0)
-- Dependencies: 224
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- TOC entry 231 (class 1259 OID 45843)
-- Name: statistics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statistics (
    id integer NOT NULL,
    type_id integer,
    period_type character varying(20) NOT NULL,
    period_date date NOT NULL,
    count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statistics OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 45842)
-- Name: statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statistics_id_seq OWNER TO postgres;

--
-- TOC entry 4996 (class 0 OID 0)
-- Dependencies: 230
-- Name: statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statistics_id_seq OWNED BY public.statistics.id;


--
-- TOC entry 216 (class 1259 OID 34609)
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    START WITH 100001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 45827)
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer,
    socket_id character varying(100),
    device_info text,
    last_active timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 45826)
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_sessions_id_seq OWNER TO postgres;

--
-- TOC entry 4997 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- TOC entry 221 (class 1259 OID 45750)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    phone_number character varying(20) NOT NULL,
    username character varying(50) NOT NULL,
    verification_code character varying(6),
    verification_code_expires timestamp without time zone,
    verification_attempts integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    is_active boolean DEFAULT true,
    last_verification_code character varying(6),
    last_code_expires timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 45749)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4998 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4764 (class 2604 OID 45804)
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- TOC entry 4773 (class 2604 OID 45862)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 4756 (class 2604 OID 45768)
-- Name: denunciation_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.denunciation_types ALTER COLUMN id SET DEFAULT nextval('public.denunciation_types_id_seq'::regclass);


--
-- TOC entry 4758 (class 2604 OID 45780)
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- TOC entry 4770 (class 2604 OID 45846)
-- Name: statistics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistics ALTER COLUMN id SET DEFAULT nextval('public.statistics_id_seq'::regclass);


--
-- TOC entry 4767 (class 2604 OID 45830)
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- TOC entry 4751 (class 2604 OID 45753)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4969 (class 0 OID 42239)
-- Dependencies: 217
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, description, created_at) FROM stdin;
0c690ef9-2a02-4f61-bb95-a4514f137c98	Viol	Violences sexuelles et agressions	2025-10-08 11:49:04.984078
b381476c-ed5b-4517-9ae4-4a3ab2b23aa2	Vol	Vols et cambriolages	2025-10-08 11:49:04.984078
deeb9842-cfec-40b1-9926-17f14de7872f	Agressions	Violences physiques	2025-10-08 11:49:04.984078
eee6c2b6-bde2-4570-9684-044a54049535	Fraude	Escroqueries et fraudes	2025-10-08 11:49:04.984078
7a585da1-84bf-4d78-8e37-4263aa5ea573	Corruption	Corruption et détournement	2025-10-08 11:49:04.984078
a9027743-f4e2-4ccc-a28a-492c175e0b0d	Usage des faux	Falsification de documents	2025-10-08 11:49:04.984078
0f191af8-f9e9-47b8-b0b2-592d9041707b	Arrestation arbitraire	Arrestations illégales	2025-10-08 11:49:04.984078
aedc5b61-7146-4047-82bf-7d228581638d	Autres	Autres types de dénonciations	2025-10-08 11:49:04.984078
\.


--
-- TOC entry 4979 (class 0 OID 45801)
-- Dependencies: 227
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, post_id, user_id, parent_comment_id, content, evidence_url, evidence_type, file_size, created_at, updated_at) FROM stdin;
1	1	2	\N	vraiment	\N	\N	\N	2025-10-11 22:01:04.087996	2025-10-11 22:01:04.087996
2	1	1	\N	Il font ca sans mandat	\N	\N	\N	2025-10-11 22:01:45.638246	2025-10-11 22:01:45.638246
\.


--
-- TOC entry 4985 (class 0 OID 45859)
-- Dependencies: 233
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, name, email, subject, message, is_resolved, created_at) FROM stdin;
\.


--
-- TOC entry 4970 (class 0 OID 42248)
-- Dependencies: 218
-- Data for Name: denonciations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.denonciations (id, user_id, category_id, title, description, location, is_anonymous, status, evidence_files, created_at, updated_at) FROM stdin;
fc78ef66-fe99-414c-8f21-5d5f8a3b639a	43a187c3-eecc-452e-a551-8d6500b1b514	0f191af8-f9e9-47b8-b0b2-592d9041707b	Arrestation arbitraire	Les policiers viennent d'arrêter des élèves d'une école à Ngaba.	\N	f	pending	[{"url": "/uploads/evidence-1760025046311-871707862.jpg", "size": 118741, "type": "image", "filename": "evidence-1760025046311-871707862.jpg", "original_name": "d40c031b-f04a-4e9d-a206-12beebb33495_w1023_r1_s.jpg"}]	2025-10-09 15:50:46.918394	2025-10-09 15:50:46.918394
a84b5b4a-e7f0-4a44-9843-e841739af905	b53bc11d-9e6b-432f-9745-5cfc95e2d8a4	7a585da1-84bf-4d78-8e37-4263aa5ea573	Permis de conduire	Pratique de soudoiement pour l'obtentention de permis de conduire	\N	t	pending	[{"url": "/uploads/evidence-1760026109141-873609788.jpg", "size": 42113, "type": "image", "filename": "evidence-1760026109141-873609788.jpg", "original_name": "permis_de_conduire_rdcongo_obtention_-768x512.jpg"}]	2025-10-09 16:08:29.154229	2025-10-09 16:08:29.154229
\.


--
-- TOC entry 4975 (class 0 OID 45765)
-- Dependencies: 223
-- Data for Name: denunciation_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.denunciation_types (id, name, description, color) FROM stdin;
1	corruption	Actes de corruption	#e74c3c
2	viol	Violences sexuelles	#9b59b6
3	vole	Vols et cambriolages	#f39c12
4	arrestation_arbitraire	Arrestations arbitraires	#34495e
5	agressions	Agressions physiques	#e67e22
6	enlevement	Enlèvements	#c0392b
7	autres	Autres types de violations	#7f8c8d
\.


--
-- TOC entry 4971 (class 0 OID 42290)
-- Dependencies: 219
-- Data for Name: media_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_files (id, denonciation_id, filename, original_name, file_type, file_path, file_size, uploaded_at) FROM stdin;
548e6732-f3eb-4224-b5e2-309988901044	fc78ef66-fe99-414c-8f21-5d5f8a3b639a	evidence-1760025046311-871707862.jpg	d40c031b-f04a-4e9d-a206-12beebb33495_w1023_r1_s.jpg	image	C:\\Users\\user\\denonciation-app\\backend\\uploads\\evidence-1760025046311-871707862.jpg	118741	2025-10-09 15:50:46.945086
778210c6-052b-400c-9e50-4072ac3fbc78	a84b5b4a-e7f0-4a44-9843-e841739af905	evidence-1760026109141-873609788.jpg	permis_de_conduire_rdcongo_obtention_-768x512.jpg	image	C:\\Users\\user\\denonciation-app\\backend\\uploads\\evidence-1760026109141-873609788.jpg	42113	2025-10-09 16:08:29.173265
\.


--
-- TOC entry 4977 (class 0 OID 45777)
-- Dependencies: 225
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, user_id, type_id, title, description, evidence_url, evidence_type, file_size, latitude, longitude, location_name, city, province, is_verified, is_approved, view_count, created_at, updated_at) FROM stdin;
1	1	4	Arrestation sans motif	Les militaires arrêtent des jeunes sans motif sur la rue 	/uploads/1760220019893-IMG_20251001_130942_949.jpg	image	2021309	\N	\N	Limete 	\N	\N	f	t	0	2025-10-11 22:00:36.576839	2025-10-11 22:00:36.576839
2	1	4	Arrestation sans motif	Les militaires arrêtent des jeunes sans motif sur la rue 	/uploads/1760220028264-IMG_20251001_130942_949.jpg	image	2021309	\N	\N	Limete 	\N	\N	f	t	0	2025-10-11 22:00:56.180211	2025-10-11 22:00:56.180211
3	1	4	Arrestation sans motif	Les militaires arrêtent des jeunes sans motif sur la rue 	/uploads/1760220033520-IMG_20251001_130942_949.jpg	image	2021309	\N	\N	Limete 	\N	\N	f	t	0	2025-10-11 22:01:02.351549	2025-10-11 22:01:02.351549
4	1	4	Arrestation sans motif	Les militaires arrêtent des jeunes sans motif sur la rue 	/uploads/1760220036109-IMG_20251001_130942_949.jpg	image	2021309	\N	\N	Limete 	\N	\N	f	t	0	2025-10-11 22:01:03.007891	2025-10-11 22:01:03.007891
\.


--
-- TOC entry 4983 (class 0 OID 45843)
-- Dependencies: 231
-- Data for Name: statistics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statistics (id, type_id, period_type, period_date, count, created_at) FROM stdin;
\.


--
-- TOC entry 4981 (class 0 OID 45827)
-- Dependencies: 229
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, socket_id, device_info, last_active, created_at) FROM stdin;
\.


--
-- TOC entry 4973 (class 0 OID 45750)
-- Dependencies: 221
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, phone_number, username, verification_code, verification_code_expires, verification_attempts, is_verified, created_at, last_login, is_active, last_verification_code, last_code_expires) FROM stdin;
2	+243993566844	mmt1	\N	\N	0	t	2025-10-11 20:11:48.319924	2025-10-11 20:12:35.954048	t	\N	\N
1	+243818704804	ktg001	\N	\N	0	t	2025-10-11 20:10:30.114395	2025-10-12 00:57:30.339344	t	\N	\N
3	0815258820	Olg	\N	\N	0	t	2025-10-14 13:07:51.992659	2025-10-14 13:08:11.736615	t	\N	\N
\.


--
-- TOC entry 4999 (class 0 OID 0)
-- Dependencies: 226
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 2, true);


--
-- TOC entry 5000 (class 0 OID 0)
-- Dependencies: 232
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);


--
-- TOC entry 5001 (class 0 OID 0)
-- Dependencies: 222
-- Name: denunciation_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.denunciation_types_id_seq', 7, true);


--
-- TOC entry 5002 (class 0 OID 0)
-- Dependencies: 224
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 4, true);


--
-- TOC entry 5003 (class 0 OID 0)
-- Dependencies: 230
-- Name: statistics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.statistics_id_seq', 1, false);


--
-- TOC entry 5004 (class 0 OID 0)
-- Dependencies: 216
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_id_seq', 100006, true);


--
-- TOC entry 5005 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 1, false);


--
-- TOC entry 5006 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- TOC entry 4777 (class 2606 OID 42247)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4803 (class 2606 OID 45810)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- TOC entry 4815 (class 2606 OID 45868)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 4779 (class 2606 OID 42259)
-- Name: denonciations denonciations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.denonciations
    ADD CONSTRAINT denonciations_pkey PRIMARY KEY (id);


--
-- TOC entry 4794 (class 2606 OID 45775)
-- Name: denunciation_types denunciation_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.denunciation_types
    ADD CONSTRAINT denunciation_types_name_key UNIQUE (name);


--
-- TOC entry 4796 (class 2606 OID 45773)
-- Name: denunciation_types denunciation_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.denunciation_types
    ADD CONSTRAINT denunciation_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4784 (class 2606 OID 42298)
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- TOC entry 4801 (class 2606 OID 45789)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- TOC entry 4811 (class 2606 OID 45850)
-- Name: statistics statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistics
    ADD CONSTRAINT statistics_pkey PRIMARY KEY (id);


--
-- TOC entry 4813 (class 2606 OID 45852)
-- Name: statistics statistics_type_id_period_type_period_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistics
    ADD CONSTRAINT statistics_type_id_period_type_period_date_key UNIQUE (type_id, period_type, period_date);


--
-- TOC entry 4808 (class 2606 OID 45836)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4788 (class 2606 OID 45761)
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 4790 (class 2606 OID 45759)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4792 (class 2606 OID 45763)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4804 (class 1259 OID 45877)
-- Name: idx_comments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at);


--
-- TOC entry 4805 (class 1259 OID 45876)
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_comment_id);


--
-- TOC entry 4806 (class 1259 OID 45875)
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- TOC entry 4780 (class 1259 OID 42306)
-- Name: idx_denonciations_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_denonciations_created_at ON public.denonciations USING btree (created_at);


--
-- TOC entry 4781 (class 1259 OID 42305)
-- Name: idx_denonciations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_denonciations_status ON public.denonciations USING btree (status);


--
-- TOC entry 4782 (class 1259 OID 42304)
-- Name: idx_denonciations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_denonciations_user_id ON public.denonciations USING btree (user_id);


--
-- TOC entry 4797 (class 1259 OID 45869)
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at);


--
-- TOC entry 4798 (class 1259 OID 45871)
-- Name: idx_posts_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_location ON public.posts USING btree (latitude, longitude);


--
-- TOC entry 4799 (class 1259 OID 45870)
-- Name: idx_posts_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_type_id ON public.posts USING btree (type_id);


--
-- TOC entry 4809 (class 1259 OID 45874)
-- Name: idx_stats_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stats_period ON public.statistics USING btree (period_type, period_date);


--
-- TOC entry 4785 (class 1259 OID 45872)
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone_number);


--
-- TOC entry 4786 (class 1259 OID 45873)
-- Name: idx_users_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_verified ON public.users USING btree (is_verified);


--
-- TOC entry 4820 (class 2606 OID 45821)
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id);


--
-- TOC entry 4821 (class 2606 OID 45811)
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4822 (class 2606 OID 45816)
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4816 (class 2606 OID 42265)
-- Name: denonciations denonciations_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.denonciations
    ADD CONSTRAINT denonciations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- TOC entry 4817 (class 2606 OID 42299)
-- Name: media_files media_files_denonciation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_denonciation_id_fkey FOREIGN KEY (denonciation_id) REFERENCES public.denonciations(id) ON DELETE CASCADE;


--
-- TOC entry 4818 (class 2606 OID 45795)
-- Name: posts posts_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.denunciation_types(id);


--
-- TOC entry 4819 (class 2606 OID 45790)
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4824 (class 2606 OID 45853)
-- Name: statistics statistics_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistics
    ADD CONSTRAINT statistics_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.denunciation_types(id);


--
-- TOC entry 4823 (class 2606 OID 45837)
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


-- Completed on 2025-10-14 17:29:17

--
-- PostgreSQL database dump complete
--

\unrestrict BeWLaoahIptlefO2uZRyDtE6WC0HJEUrNU9WQtM5lmLD92QSqu1iGLebG65EYkR

