import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Palette,
  Layout,
  X,
  Laptop,
  Tablet,
  Smartphone,
  UploadCloud,
  Maximize2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Link,
  Link2Off,
  GripVertical
} from 'lucide-react';

import { cmsApi, CMSPage, CMSInquiry } from '../api/cmsApi';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { confirm } from '../../../stores/useConfirmStore';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const backendRootUrl = apiBaseUrl.replace('/api/v1', '');

const AVAILABLE_TEMPLATES = [
  { id: 'template-001-prestige', name: 'Prestige Academy', desc: 'Elegant and professional. Best for established private schools. Uses Playfair Serif.' },
  { id: 'template-002-modern', name: 'Modern Clean', desc: 'Sleek, minimalist, and grid-aligned. Great for urban institutions.' },
  { id: 'template-003-vibrant', name: 'Vibrant Kids', desc: 'Rounded borders and primary accent tones. Tailored for primary education.' },
  { id: 'template-004-elite', name: 'Elite Prep', desc: 'Traditional boarding school layouts with strong crimson and navy highlights.' },
  { id: 'template-005-montessori', name: 'Montessori Play', desc: 'Playful warm pastels, soft edges, and friendly rounded components.' },
  { id: 'template-006-heritage', name: 'Heritage College', desc: 'Ivy League feel. Deep serif display headlines and high-contrast spacing.' },
  { id: 'template-007-global', name: 'Global International', desc: 'Tech-forward bilingual school design with contemporary card grids.' },
  { id: 'template-008-pinnacle', name: 'Pinnacle STEM', desc: 'Sharp edges, modern dark-slate gradients, and teal accenting.' },
  { id: 'template-009-greenwood', name: 'Greenwood Eco-School', desc: 'Natural forest greens, warm sand tones, and spacious layouts.' },
  { id: 'template-010-summit', name: 'Summit Athletics', desc: 'Energetic bold display type with high-contrast banners for sports focus.' },
  { id: 'template-011-beacon', name: 'Beacon Preparatory', desc: 'Royal blue, gold borders, and elegant traditional alignments.' },
  { id: 'template-012-horizon', name: 'Horizon Waldorf', desc: 'Artistic warm tones, comfortable margins, and soft rounded details.' }
];

const AVAILABLE_COLOR_SCHEMES: Record<string, string[]> = {
  'template-001-prestige': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-002-modern': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-003-vibrant': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-004-elite': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-005-montessori': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-006-heritage': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-007-global': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-008-pinnacle': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-009-greenwood': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-010-summit': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-011-beacon': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm'],
  'template-012-horizon': ['Navy & Gold', 'Forest & Cream', 'Earthy & Warm']
};

const TEMPLATE_PREVIEWS: Record<string, { primary: string; accent: string; style: string }> = {
  'template-001-prestige': { primary: 'bg-[#1E3A5F]', accent: 'bg-[#F5A623]', style: 'font-serif' },
  'template-002-modern': { primary: 'bg-neutral-800', accent: 'bg-neutral-450', style: 'font-sans' },
  'template-003-vibrant': { primary: 'bg-emerald-600', accent: 'bg-rose-500', style: 'font-sans rounded' },
  'template-004-elite': { primary: 'bg-rose-800', accent: 'bg-blue-900', style: 'font-serif' },
  'template-005-montessori': { primary: 'bg-amber-500', accent: 'bg-cyan-400', style: 'font-sans rounded' },
  'template-006-heritage': { primary: 'bg-slate-900', accent: 'bg-amber-600', style: 'font-serif' },
  'template-007-global': { primary: 'bg-indigo-700', accent: 'bg-teal-400', style: 'font-sans' },
  'template-008-pinnacle': { primary: 'bg-zinc-900', accent: 'bg-emerald-400', style: 'font-sans' },
  'template-009-greenwood': { primary: 'bg-emerald-800', accent: 'bg-amber-600', style: 'font-sans' },
  'template-010-summit': { primary: 'bg-orange-600', accent: 'bg-slate-900', style: 'font-sans' },
  'template-011-beacon': { primary: 'bg-blue-800', accent: 'bg-yellow-500', style: 'font-serif' },
  'template-012-horizon': { primary: 'bg-purple-700', accent: 'bg-pink-400', style: 'font-sans rounded' }
};

const STOCK_IMAGES = [
  { category: 'Campus', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800', caption: 'Classic Red Brick Campus' },
  { category: 'Campus', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800', caption: 'University Main Hall Gate' },
  { category: 'Campus', url: 'https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?auto=format&fit=crop&q=80&w=800', caption: 'School Courtyard and Lawns' },
  { category: 'Classroom', url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=800', caption: 'Elementary Colorful Classroom' },
  { category: 'Classroom', url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800', caption: 'Secondary School Exam Hall' },
  { category: 'Classroom', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800', caption: 'High School Smart Classroom' },
  { category: 'Library', url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=800', caption: 'Classic Wooden Library Shelves' },
  { category: 'Library', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=800', caption: 'Modern Quiet Library Lounge' },
  { category: 'Science Labs', url: 'https://images.unsplash.com/photo-1564981797816-1043d01a17da?auto=format&fit=crop&q=80&w=800', caption: 'Chemistry Beakers and Equipment' },
  { category: 'Science Labs', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800', caption: 'Biology Student Microscope' },
  { category: 'Sports', url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800', caption: 'Yoga & Aerobics Studio' },
  { category: 'Sports', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800', caption: 'Football Field & Running Track' },
  { category: 'Faculty', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800', caption: 'Smiling Teacher in Classroom' },
  { category: 'Faculty', url: 'https://images.unsplash.com/photo-1580894732444-8fecef2271ff?auto=format&fit=crop&q=80&w=800', caption: 'Tutoring Student in Computer Lab' }
];

export function CMSEditorPage() {
  const queryClient = useQueryClient();
  const { schoolId } = useAuthStore();
  const { zenMode, setZenMode } = useUIStore();
  
  // Editor UI State
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [showNewPageModal, setShowNewPageModal] = useState<boolean>(false);
  const [newPageTitle, setNewPageTitle] = useState<string>('');
  const [newPageSlug, setNewPageSlug] = useState<string>('');
  const [publishSuccessUrl, setPublishSuccessUrl] = useState<string | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Introductions');

  // New features UI State
  const [iframeLoading, setIframeLoading] = useState<boolean>(false);
  const [leftTab, setLeftTab] = useState<'outline' | 'inquiries'>('outline');
  const [localName, setLocalName] = useState<string>('');
  const [logoPickerOpen, setLogoPickerOpen] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [newlyAddedSectionId, setNewlyAddedSectionId] = useState<string | null>(null);
  const [linkPopoverPickerOpen, setLinkPopoverPickerOpen] = useState<boolean>(false);
  const [pendingLinkTarget, setPendingLinkTarget] = useState<{ sectionId: string; field: string } | null>(null);

  // Set iframe loading state when page or refresh key changes
  useEffect(() => {
    setIframeLoading(true);
  }, [activePageId, refreshKey]);

  // Query Inquiries
  const { data: inquiriesRes, isLoading: inquiriesLoading } = useQuery({
    queryKey: ['cms_inquiries'],
    queryFn: cmsApi.getInquiries
  });
  const inquiries: CMSInquiry[] = inquiriesRes?.data || [];
  const newInquiriesCount = inquiries.filter((inq: CMSInquiry) => inq.status === 'new').length;

  // Mutation: Update Inquiry Status
  const updateInquiryMutation = useMutation({
    mutationFn: (variables: { id: string; status: string }) => 
      cmsApi.updateInquiryStatus(variables.id, variables.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms_inquiries'] });
    }
  });

  // Handle keypress Escape key triggers to exit Zen Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode, setZenMode]);

  const updateOptimisticPages = (updatedSections: any[]) => {
    if (!activePageId) return;
    queryClient.setQueryData(['cms_pages'], (old: any) => {
      if (!old || !old.data) return old;
      const updatedList = old.data.map((p: any) => {
        if (p.id === activePageId) {
          return { ...p, sections: updatedSections };
        }
        return p;
      });
      return { ...old, data: updatedList };
    });
  };

  // 1. Fetch Site Settings
  const { data: siteRes, isLoading: siteLoading } = useQuery({
    queryKey: ['cms_site'],
    queryFn: cmsApi.getSite
  });
  const site = siteRes?.data;

  useEffect(() => {
    if (site?.settings?.name !== undefined) {
      setLocalName(site.settings.name || '');
    }
  }, [site?.settings?.name]);

  // 2. Fetch Pages List
  const { data: pagesRes, isLoading: pagesLoading } = useQuery({
    queryKey: ['cms_pages'],
    queryFn: cmsApi.getPages
  });
  const pages = pagesRes?.data || [];

  // Automatically select first page as active if not set
  useEffect(() => {
    if (pages.length > 0 && !activePageId) {
      const homePage = pages.find(p => p.slug === 'home') || pages[0];
      setActivePageId(homePage.id);
    }
  }, [pages, activePageId]);

  const activePage = pages.find(p => p.id === activePageId);

  const handleInlineTextUpdate = (sectionId: string, field: string, value: string) => {
    if (!activePage) return;
    const updatedSections = activePage.sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          content: { ...sec.content, [field]: value }
        };
      }
      return sec;
    });

    updateOptimisticPages(updatedSections);
    updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: true });
  };

  const handleSelectLinkFile = (url: string) => {
    if (!pendingLinkTarget || !activePage) return;
    const { sectionId, field } = pendingLinkTarget;
    
    const updatedSections = activePage.sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          content: { ...sec.content, [field]: url }
        };
      }
      return sec;
    });
    
    updateOptimisticPages(updatedSections);
    updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: true });
    
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'update_link_url',
        sectionId,
        field,
        value: url
      }, backendRootUrl);
    }
    
    setLinkPopoverPickerOpen(false);
    setPendingLinkTarget(null);
  };

  // Secure message listener for click-to-edit triggers inside the preview iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Validate secure sender origin (port 8000)
      const allowedBackendOrigins = [
        backendRootUrl,
        backendRootUrl.replace('localhost', '127.0.0.1'),
        backendRootUrl.replace('127.0.0.1', 'localhost'),
        backendRootUrl.replace('localhost', '[::1]')
      ];
      if (!allowedBackendOrigins.includes(event.origin)) return;
      
      const data = event.data;
      if (data && data.type === 'select_section' && data.sectionId) {
        setActiveSectionId(data.sectionId);
      } else if (data && data.type === 'iframe_ready') {
        if (activeSectionId) {
          const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            setTimeout(() => {
              iframe.contentWindow?.postMessage({
                type: 'highlight_section',
                id: activeSectionId
              }, backendRootUrl);
            }, 250);
          }
        }
      } else if (data && data.type === 'update_text_inline' && data.sectionId && data.field) {
        handleInlineTextUpdate(data.sectionId, data.field, data.value);
      } else if (data && data.type === 'select_page_by_slug' && data.slug) {
        const targetPage = pages.find(p => p.slug === data.slug);
        if (targetPage) {
          setActivePageId(targetPage.id);
          setActiveSectionId(null);
        }
      } else if (data && data.type === 'update_site_setting_inline' && data.field) {
        handleSettingsChange(data.field, data.value);
      } else if (data && data.type === 'update_page_title_inline' && data.pageId) {
        // Update page title in the pages cache immediately and query mutation
        queryClient.setQueryData(['cms_pages'], (old: any) => {
          if (!old || !old.data) return old;
          const updatedList = old.data.map((p: any) => {
            if (p.id === data.pageId) {
              return { ...p, title: data.value };
            }
            return p;
          });
          return { ...old, data: updatedList };
        });
        updatePageMutation.mutate({ id: data.pageId, data: { title: data.value }, silent: true });
      } else if (data && data.type === 'update_link_inline' && data.sectionId) {
        if (!activePage) return;
        const updatedSections = activePage.sections.map(sec => {
          if (sec.id === data.sectionId) {
            const content = { ...sec.content };
            if (data.labelField) content[data.labelField] = data.labelValue;
            if (data.urlField) content[data.urlField] = data.urlValue;
            if (data.newTabField) content[data.newTabField] = data.newTabValue;
            return { ...sec, content };
          }
          return sec;
        });
        updateOptimisticPages(updatedSections);
        updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: true });
      } else if (data && data.type === 'open_media_library_for_link' && data.sectionId && data.field) {
        setPendingLinkTarget({ sectionId: data.sectionId, field: data.field });
        setLinkPopoverPickerOpen(true);
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [activeSectionId, activePage, pages, queryClient]);

  // 3. Mutation: Update Site Settings
  const updateSiteMutation = useMutation({
    mutationFn: cmsApi.updateSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms_site'] });
      setRefreshKey(prev => prev + 1);
    }
  });

  // 4. Mutation: Update Page Content
  const updatePageMutation = useMutation({
    mutationFn: (variables: { id: string; data: Partial<CMSPage>; silent?: boolean }) => 
      cmsApi.updatePage(variables.id, variables.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cms_pages'] });
      setIsSaving(false);
      // Reload iframe only on non-silent changes (e.g. section re-ordering/deletion/creation)
      if (!variables.silent) {
        setRefreshKey(prev => prev + 1);
      }
    },
    onError: () => {
      setIsSaving(false);
    }
  });

  // 5. Mutation: Create Page
  const createPageMutation = useMutation({
    mutationFn: cmsApi.createPage,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cms_pages'] });
      setActivePageId(res.data.id);
      setShowNewPageModal(false);
      setNewPageTitle('');
      setNewPageSlug('');
      setRefreshKey(prev => prev + 1);
    }
  });

  // 6. Mutation: Delete Page
  const deletePageMutation = useMutation({
    mutationFn: cmsApi.deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms_pages'] });
      setActivePageId(null);
      setRefreshKey(prev => prev + 1);
    }
  });

  // 7. Mutation: Publish Site
  const publishMutation = useMutation({
    mutationFn: cmsApi.publishSite,
    onSuccess: (res) => {
      setPublishSuccessUrl(res.data.url);
      queryClient.invalidateQueries({ queryKey: ['cms_site'] });
    }
  });

  if (siteLoading || pagesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-semibold text-neutral-500 font-display">Loading Site Builder workspace...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="card text-center py-20 space-y-4 max-w-xl mx-auto mt-10">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-neutral-800 font-display">Configuration Error</h3>
        <p className="text-sm text-neutral-500">Failed to load website settings record. Contact superadmin.</p>
      </div>
    );
  }

  // --- Handlers for Site Config ---
  const handleTemplateChange = (templateId: string) => {
    updateSiteMutation.mutate({ template_id: templateId });
  };

  const handleColorSchemeChange = (scheme: string) => {
    updateSiteMutation.mutate({ color_scheme: scheme });
  };

  const handleSettingsChange = (field: string, value: any) => {
    const updatedSettings = { ...site.settings, [field]: value };
    updateSiteMutation.mutate({ settings: updatedSettings });
  };

  // --- Handlers for Page Sections ---
  const handleSaveSection = (sectionId: string, updatedContent: any, updatedStyle: any, silent: boolean = false) => {
    if (!activePage) return;
    
    // Construct sections list
    const updatedSections = activePage.sections.map(sec => {
      if (sec.id === sectionId) {
        return { 
          ...sec, 
          content: updatedContent, 
          style: updatedStyle || sec.style || {
            layout: 'split',
            align: 'left',
            bg_type: 'solid',
            bg_image: '',
            bg_overlay_opacity: 0.4,
            theme: 'light',
            padding: 'medium'
          } 
        };
      }
      return sec;
    });

    if (silent) {
      setIsSaving(true);
      // Debounced background save
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(() => {
        updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: true });
      }, 1000);
      setSaveTimeout(timeout);
    } else {
      setIsSaving(true);
      if (saveTimeout) clearTimeout(saveTimeout);
      updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: false });
    }
  };

  const handleLiveUpdate = (sectionId: string, content: any, style: any, sectionType: string) => {
    // Send postMessage securely to the preview iframe
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'update_section_content',
        id: sectionId,
        sectionType,
        content,
        style
      }, backendRootUrl);
    }
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    if (!activePage) return;
    const targetSec = activePage.sections.find(s => s.id === sectionId);
    if (!targetSec) return;

    const updatedSections = activePage.sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, visible: !sec.visible };
      }
      return sec;
    });

    updateOptimisticPages(updatedSections);

    // Iframe DOM update
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'toggle_section_visibility',
        id: sectionId,
        visible: !targetSec.visible
      }, backendRootUrl);
    }

    updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: true });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!activePage) return;
    const updatedSections = [...activePage.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= updatedSections.length) return;
    
    // Swap
    const temp = updatedSections[index];
    updatedSections[index] = updatedSections[targetIndex];
    updatedSections[targetIndex] = temp;

    // Reset order values
    const ordered = updatedSections.map((sec, i) => ({ ...sec, order: i + 1 }));
    updateOptimisticPages(ordered);

    // Iframe DOM update
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'reorder_sections',
        order: ordered.map(s => s.id)
      }, backendRootUrl);
    }

    updatePageMutation.mutate({ id: activePage.id, data: { sections: ordered }, silent: true });
  };

  const handleDropSection = (targetIdx: number) => {
    if (draggedIndex === null || draggedIndex === targetIdx || !activePage) return;
    
    const sections = [...activePage.sections];
    const [draggedItem] = sections.splice(draggedIndex, 1);
    sections.splice(targetIdx, 0, draggedItem);
    
    // Reset order values
    const ordered = sections.map((sec, i) => ({ ...sec, order: i + 1 }));
    updateOptimisticPages(ordered);
    
    // Iframe DOM update
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'reorder_sections',
        ids: ordered.map(s => s.id),
        order: ordered.map(s => s.id)
      }, backendRootUrl);
    }
    
    updatePageMutation.mutate({ id: activePage.id, data: { sections: ordered }, silent: true });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!activePage) return;
    const updatedSections = activePage.sections.filter(sec => sec.id !== sectionId);
    updateOptimisticPages(updatedSections);

    // Iframe DOM update
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'delete_section',
        id: sectionId
      }, backendRootUrl);
    }

    updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: true });
    if (activeSectionId === sectionId) {
      setActiveSectionId(null);
    }
  };

  const handleAddSection = (type: string) => {
    if (!activePage) return;
    
    const newSectionId = `sec_${Date.now()}`;
    let defaultContent: any = {};
    const defaultStyle = {
      layout: 'split',
      align: 'left',
      bg_type: 'solid',
      bg_image: '',
      bg_overlay_opacity: 0.4,
      theme: 'light',
      padding: 'medium'
    };
    
    if (type === 'hero') {
      defaultContent = { tagline: 'Tagline text', headline: 'New Hero Headline', subheadline: 'Hero subheadline description text', cta_primary_label: 'Apply Now', cta_primary_url: '#', image_url: '' };
    } else if (type === 'stats') {
      defaultContent = { items: [{ label: 'Stat Label', value: '100+' }] };
    } else if (type === 'about') {
      defaultContent = { heading: 'About Us', text: 'School description text here.', image_url: '' };
    } else if (type === 'testimonials') {
      defaultContent = { heading: 'Testimonials', items: [{ name: 'Parent Name', role: 'Role', text: 'Feedback text' }] };
    } else if (type === 'gallery') {
      defaultContent = { heading: 'Gallery', images: [] };
    } else if (type === 'contact') {
      defaultContent = { heading: 'Get In Touch', phone: '+91 99999 99999', email: 'help@school.com', address: 'Campus address' };
    } else if (type === 'faculty') {
      defaultContent = { heading: 'Faculty Directory', description: 'Subject experts sync' };
    } else if (type === 'admissions') {
      defaultContent = { heading: 'Fee Structures', description: 'Sync fee schedules' };
    } else if (type === 'custom') {
      defaultContent = { heading: 'Highlights & Achievements', subheading: 'Our Core Virtues', paragraph: 'Detailed narrative describing academics, sports, or infrastructure.', items: [{ text: 'Dynamic Learning Models' }, { text: 'Certified CBSE Educators' }] };
    }

    const newSec = {
      id: newSectionId,
      type,
      order: activePage.sections.length + 1,
      visible: true,
      content: defaultContent,
      style: defaultStyle
    };

    const updatedSections = [...activePage.sections, newSec];
    updateOptimisticPages(updatedSections);
    updatePageMutation.mutate({ id: activePage.id, data: { sections: updatedSections }, silent: false });
    setActiveSectionId(newSectionId);
    setNewlyAddedSectionId(newSectionId);
    setTimeout(() => {
      setNewlyAddedSectionId(null);
    }, 2500);
  };

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle || !newPageSlug) return;
    
    const defaultSections = [
      {
        id: `sec_hero_${Date.now()}`,
        type: 'hero',
        order: 1,
        visible: true,
        style: { layout: 'split', align: 'left', bg_type: 'solid', bg_image: '', bg_overlay_opacity: 0.4, theme: 'light', padding: 'medium' },
        content: { tagline: 'Welcome', headline: newPageTitle, subheadline: 'Learn more about this page segment.' }
      },
      {
        id: `sec_contact_${Date.now()}`,
        type: 'contact',
        order: 2,
        visible: true,
        style: { layout: 'split', align: 'left', bg_type: 'solid', bg_image: '', bg_overlay_opacity: 0.4, theme: 'light', padding: 'medium' },
        content: { heading: 'Contact Info', phone: site.settings.phone || '+91 98765 43210', email: site.settings.email || 'info@school.com', address: site.settings.address || 'Campus Address' }
      }
    ];

    createPageMutation.mutate({
      title: newPageTitle,
      slug: newPageSlug.toLowerCase().replace(/[^a-z0-9\-]/g, ''),
      sections: defaultSections
    });
  };

  const handleDeletePage = async (pageId: string) => {
    if (await confirm('Are you sure you want to delete this page? This action is permanent.', { type: 'danger', title: 'Delete Page' })) {
      deletePageMutation.mutate(pageId);
    }
  };

  // Base API preview URL
  const previewUrl = `${backendRootUrl}/api/v1/cms/preview/${activePage?.slug || 'home'}?school_id=${schoolId}&refresh=${refreshKey}`;

  return (
    <div className="space-y-6">
      {/* Editor Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl text-primary-light">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-display tracking-tight">Website Builder & CMS</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${site.is_published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {site.is_published ? 'PUBLISHED' : 'DRAFT'}
              </span>
              {isSaving && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving changes...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Customize templates, click components to edit, and sync live ERP structures</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setZenMode(!zenMode)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border transition ${
              zenMode 
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 border-amber-500 shadow-md shadow-amber-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Zen Focus Mode (Esc to exit)"
          >
            <Maximize2 className="h-4 w-4" />
            {zenMode ? 'Exit Fullscreen' : 'Fullscreen Focus'}
          </button>
          {site.is_published && (
            <a 
              href={`${backendRootUrl}/published/${schoolId}/index.html`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Live Site
            </a>
          )}
          <button 
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition shadow-lg shadow-primary/20 disabled:opacity-55"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Publish Website
              </>
            )}
          </button>
        </div>
      </div>
 
      {/* Main Builder Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px] items-stretch">
        
        {/* PANEL 1: Left Navigation (Pages & Sections list) */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Left Panel Tabs Header */}
          <div className="flex border-b border-neutral-200 shrink-0">
            <button
              type="button"
              onClick={() => setLeftTab('outline')}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
                leftTab === 'outline' ? 'border-primary text-primary font-display' : 'border-transparent text-neutral-400 hover:text-neutral-600 font-display'
              }`}
            >
              Site Outline
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('inquiries')}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition relative ${
                leftTab === 'inquiries' ? 'border-primary text-primary font-display' : 'border-transparent text-neutral-400 hover:text-neutral-600 font-display'
              }`}
            >
              Inquiries Inbox
              {newInquiriesCount > 0 && (
                <span className="absolute top-2.5 right-4 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
                  {newInquiriesCount}
                </span>
              )}
            </button>
          </div>

          {leftTab === 'outline' ? (
            <>
              {/* Pages management section */}
              <div className="p-4 border-b border-neutral-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Web Pages</span>
                  <button 
                    onClick={() => setShowNewPageModal(true)}
                    className="p-1 text-primary hover:bg-neutral-100 rounded-md transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {pages.map((p) => (
                    <div 
                      key={p.id}
                      className={`group flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                        activePageId === p.id 
                          ? 'bg-neutral-100 text-primary' 
                          : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <div 
                        onClick={() => {
                          setActivePageId(p.id);
                          setActiveSectionId(null);
                        }}
                        className="flex-1 truncate"
                      >
                        {p.title} <span className="text-[10px] text-neutral-400">({p.slug})</span>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            updatePageMutation.mutate({
                              id: p.id,
                              data: { is_published: !p.is_published }
                            });
                          }}
                          className="p-1 text-neutral-400 hover:text-primary transition"
                          title={p.is_published ? "Hide from Navigation" : "Show in Navigation"}
                        >
                          {p.is_published ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-neutral-400" />}
                        </button>
                        {p.slug !== 'home' && (
                          <button 
                            type="button"
                            onClick={() => handleDeletePage(p.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition"
                            title="Delete Page"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
     
              {/* Section stack outline */}
              <div className="flex-1 p-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Page Layout Sections</span>
                </div>
                
                {activePage ? (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                    {activePage.sections.map((sec, idx) => (
                      <div 
                        key={sec.id}
                        ref={(el) => {
                          if (el && newlyAddedSectionId === sec.id) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }}
                        draggable="true"
                        onDragStart={() => setDraggedIndex(idx)}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverIndex !== idx) setDragOverIndex(idx);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropSection(idx);
                        }}
                        onClick={() => {
                          setActiveSectionId(sec.id);
                          const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                          if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage({
                              type: 'highlight_section',
                              id: sec.id
                            }, backendRootUrl);
                          }
                        }}
                        onMouseEnter={() => {
                          const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                          if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage({
                              type: 'highlight_section',
                              id: sec.id
                            }, backendRootUrl);
                          }
                        }}
                        onMouseLeave={() => {
                          const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                          if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage({
                              type: 'unhighlight_section',
                              id: sec.id
                            }, backendRootUrl);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all duration-150 ${
                          activeSectionId === sec.id 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                        } ${draggedIndex === idx ? 'opacity-40 border-dashed border-primary bg-neutral-50' : ''} ${
                          dragOverIndex === idx && draggedIndex !== idx ? 'border-primary bg-primary/5 translate-x-1' : ''
                        } ${
                          newlyAddedSectionId === sec.id ? 'ring-2 ring-primary border-primary animate-pulse bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <GripVertical className="h-3.5 w-3.5 text-neutral-400 cursor-grab active:cursor-grabbing shrink-0 opacity-60 hover:text-neutral-600 transition" />
                          <Layout className="h-4 w-4 shrink-0 opacity-60" />
                          <span className="truncate capitalize">{sec.type} section</span>
                          {!sec.visible && <EyeOff className="h-3.5 w-3.5 text-neutral-400 shrink-0" />}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleMoveSection(idx, 'up')}
                            disabled={idx === 0}
                            className="p-0.5 hover:bg-neutral-200 rounded disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => handleMoveSection(idx, 'down')}
                            disabled={idx === activePage.sections.length - 1}
                            className="p-0.5 hover:bg-neutral-200 rounded disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => handleToggleSectionVisibility(sec.id)}
                            className="p-0.5 hover:bg-neutral-200 rounded"
                          >
                            {sec.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-red-500" />}
                          </button>
                          <button 
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-0.5 hover:bg-neutral-200 rounded text-neutral-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-neutral-400">
                    Select a page to view its sections
                  </div>
                )}
                
                {/* Add Section Controls */}
                {activePage && (
                  <div className="mt-4 border-t border-neutral-100 pt-4 shrink-0">
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5 font-display">Add Page Section</span>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {[
                        { name: 'Introductions', types: ['hero', 'about'], desc: 'Banners, taglines, and school description sections' },
                        { name: 'Stats & Feedbacks', types: ['stats', 'testimonials'], desc: 'Numeric counters and parent testimonials grid' },
                        { name: 'Live ERP Sync', types: ['faculty', 'admissions'], desc: 'Automatic directory and fee structures' },
                        { name: 'Narrative & Media', types: ['gallery', 'custom'], desc: 'Image lightboxes and custom rich text' },
                        { name: 'Communications', types: ['contact'], desc: 'Contact details and inquiry form' }
                      ].map((cat) => {
                        const isOpen = expandedCategory === cat.name;
                        return (
                          <div key={cat.name} className="border border-neutral-200 rounded-xl overflow-hidden transition">
                            <button
                              type="button"
                              onClick={() => setExpandedCategory(isOpen ? null : cat.name)}
                              className="w-full flex items-center justify-between p-2 bg-neutral-50 hover:bg-neutral-100 transition text-left"
                            >
                              <div className="flex items-center gap-1.5">
                                {isOpen ? (
                                  <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                                ) : (
                                  <Folder className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                                )}
                                <div>
                                  <span className="text-[10px] font-bold text-neutral-800">{cat.name}</span>
                                </div>
                              </div>
                              {isOpen ? (
                                <ChevronDown className="h-3 w-3 text-neutral-550 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-neutral-400 shrink-0" />
                              )}
                            </button>
                            {isOpen && (
                              <div className="p-2 bg-white border-t border-neutral-200 grid grid-cols-2 gap-1.5">
                                {cat.types.map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => handleAddSection(type)}
                                    className="flex flex-col items-center justify-center p-2 bg-neutral-50 hover:bg-primary/5 hover:text-primary hover:border-primary/50 rounded-lg border border-neutral-200 text-center transition group relative"
                                  >
                                    <span className="text-[10px] font-bold capitalize text-neutral-750 group-hover:text-primary">
                                      {type}
                                    </span>
                                    <span className="text-[8px] text-neutral-400 font-semibold mt-0.5 group-hover:text-primary/75">
                                      + Insert
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Inquiries Inbox Tab Content */
            <div className="flex-1 p-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Enquiry Submissions</span>
                <button
                  type="button"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['cms_inquiries'] })}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Refresh
                </button>
              </div>

              {inquiriesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : inquiries.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                  {inquiries.map((inq: CMSInquiry) => (
                    <div 
                      key={inq.id}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        inq.status === 'new' 
                          ? 'border-amber-300 bg-amber-500/5' 
                          : inq.status === 'read' 
                            ? 'border-neutral-250 bg-neutral-50' 
                            : 'border-emerald-250 bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h4 className="font-bold text-neutral-800">{inq.name}</h4>
                          <a href={`mailto:${inq.email}`} className="text-[10px] text-neutral-500 hover:underline">{inq.email}</a>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                          inq.status === 'new' 
                            ? 'bg-amber-500/20 text-amber-700' 
                            : inq.status === 'read' 
                              ? 'bg-blue-500/20 text-blue-700' 
                              : 'bg-emerald-500/20 text-emerald-700'
                        }`}>
                          {inq.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-neutral-600 bg-white/70 p-2 border border-neutral-100 rounded-lg mt-2 leading-relaxed whitespace-pre-line">
                        {inq.message}
                      </p>

                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-neutral-100/50">
                        <span className="text-[9px] text-neutral-400">
                          {new Date(inq.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        <div className="flex gap-1.5">
                          {inq.status === 'new' && (
                            <button
                              type="button"
                              onClick={() => updateInquiryMutation.mutate({ id: inq.id, status: 'read' })}
                              className="text-[9px] font-bold text-blue-600 hover:underline"
                            >
                              Mark Read
                            </button>
                          )}
                          {inq.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => updateInquiryMutation.mutate({ id: inq.id, status: 'resolved' })}
                              className="text-[9px] font-bold text-emerald-600 hover:underline"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-neutral-400 p-4 space-y-2">
                  <Globe className="h-8 w-8 text-neutral-300" />
                  <p className="font-semibold">Inbox Empty</p>
                  <p className="text-[10px] leading-relaxed">When parents or website visitors submit the Contact enquiry form, their details will appear here.</p>
                </div>
              )}
            </div>
          )}
        </div>
 
        {/* PANEL 2: Center Iframe Preview */}
        <div className="lg:col-span-6 flex flex-col bg-slate-100 border border-neutral-200 rounded-2xl overflow-hidden shadow-inner p-3 relative h-full">
          <div className="flex items-center justify-between mb-2 px-1 text-xs text-neutral-500 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-neutral-200/80 p-0.5 rounded-lg border border-neutral-250">
                <button
                  type="button"
                  onClick={() => setViewport('desktop')}
                  className={`p-1 rounded transition flex items-center gap-1 text-[10px] font-bold ${
                    viewport === 'desktop' ? 'bg-white text-neutral-800 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="Desktop View"
                >
                  <Laptop className="h-3 w-3" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('tablet')}
                  className={`p-1 rounded transition flex items-center gap-1 text-[10px] font-bold ${
                    viewport === 'tablet' ? 'bg-white text-neutral-800 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="Tablet View"
                >
                  <Tablet className="h-3 w-3" />
                  Tablet
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('mobile')}
                  className={`p-1 rounded transition flex items-center gap-1 text-[10px] font-bold ${
                    viewport === 'mobile' ? 'bg-white text-neutral-800 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-md">
              <span>/{activePage?.slug || 'home'}</span>
            </div>
          </div>
 
          <div className="flex-1 w-full bg-neutral-800/5 rounded-xl overflow-hidden relative min-h-0 flex items-center justify-center p-4">
            {iframeLoading && (
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center z-30 transition-all duration-305">
                <div className="bg-white/95 border border-neutral-200/50 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-xs font-bold text-neutral-800 font-display">Updating preview layout...</span>
                </div>
              </div>
            )}
            {activePage ? (
              <div 
                className="h-full bg-white shadow-xl transition-all duration-300 border border-neutral-300 relative overflow-hidden"
                style={{
                  width: viewport === 'desktop' ? '100%' : (viewport === 'tablet' ? '768px' : '375px'),
                  maxWidth: '100%',
                  borderRadius: viewport === 'desktop' ? '0' : '20px',
                  boxShadow: viewport === 'desktop' ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
              >
                {viewport !== 'desktop' && (
                  <div className="absolute top-0 left-0 right-0 h-4 bg-neutral-100 border-b border-neutral-200 flex justify-center items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                    <span className="w-8 h-1 rounded-full bg-neutral-300" />
                  </div>
                )}
                <iframe 
                  key={`${activePageId}-${refreshKey}`}
                  id="preview-iframe"
                  src={previewUrl}
                  className="w-full h-full border-0"
                  style={{ paddingTop: viewport === 'desktop' ? '0' : '16px' }}
                  title="CMS Template Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  onLoad={() => {
                    setIframeLoading(false);
                    if (activeSectionId) {
                      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                      if (iframe && iframe.contentWindow) {
                        setTimeout(() => {
                          iframe.contentWindow?.postMessage({
                            type: 'highlight_section',
                            id: activeSectionId
                          }, backendRootUrl);
                        }, 250);
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-400 text-xs bg-white">
                No page selected
              </div>
            )}
          </div>
        </div>

        {/* PANEL 3: Right Config & Content Editor */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm h-full">
          {/* Site theme configuration tab */}
          <div className="p-4 border-b border-neutral-100 flex flex-col gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-display">Theme & Styles</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-550 mb-2">Theme Template Gallery</label>
                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {AVAILABLE_TEMPLATES.map(t => {
                    const preview = TEMPLATE_PREVIEWS[t.id];
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleTemplateChange(t.id)}
                        className={`p-3 rounded-xl border-2 text-left cursor-pointer transition relative group ${
                          site.template_id === t.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-neutral-250 hover:border-neutral-350 bg-neutral-50'
                        }`}
                      >
                        {/* Mini Layout Mock */}
                        <div className="h-14 w-full bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 mb-2 flex flex-col relative">
                          {/* Header */}
                          <div className={`h-3 w-full flex items-center justify-between px-2 shrink-0 ${preview?.primary || 'bg-neutral-850'}`}>
                            <div className="w-6 h-1 rounded-full bg-white/40" />
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1 bg-white/30 rounded-full" />
                            </div>
                          </div>
                          {/* Body */}
                          <div className="flex-1 p-1 flex gap-1 items-start bg-white">
                            <div className="flex-1 space-y-1">
                              <div className="w-8 h-1 bg-neutral-300 rounded" />
                              <div className="w-12 h-1 bg-neutral-200 rounded" />
                              <div className="w-10 h-1 bg-neutral-200 rounded" />
                            </div>
                            <div className={`w-5 h-5 rounded shrink-0 ${preview?.accent || 'bg-neutral-350'} opacity-65 flex items-center justify-center`}>
                              <span className="text-[6px] text-white font-bold select-none">Aa</span>
                            </div>
                          </div>
                        </div>

                        <div className="font-bold text-xs text-neutral-850">{t.name}</div>
                        <div className="text-[10px] text-neutral-500 mt-1 leading-normal">{t.desc}</div>
                        {site.template_id === t.id && (
                          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">Color Scheme Preset</label>
                <div className="flex gap-2">
                  {(AVAILABLE_COLOR_SCHEMES[site.template_id] || ['Navy & Gold', 'Forest & Cream']).map(scheme => (
                    <button
                      key={scheme}
                      onClick={() => handleColorSchemeChange(scheme)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                        site.color_scheme === scheme 
                          ? 'bg-neutral-800 text-white border-neutral-800' 
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {scheme}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">School Public Name</label>
                <input 
                  type="text" 
                  value={localName} 
                  onChange={e => {
                    const val = e.target.value;
                    setLocalName(val);
                    // Post live settings update to iframe instantly
                    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.postMessage({
                        type: 'update_site_settings',
                        settings: { ...site?.settings, name: val }
                      }, backendRootUrl);
                    }
                  }}
                  onBlur={() => {
                    if (localName !== site?.settings?.name) {
                      handleSettingsChange('name', localName);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  placeholder="e.g. Prestige School"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-550 mb-1">School Brand Logo</label>
                {site.settings.logo_url ? (
                  <div className="flex items-center gap-3 p-2 border border-neutral-200 rounded-xl bg-neutral-50">
                    <img 
                      src={`${backendRootUrl}${site.settings.logo_url}`} 
                      alt="Logo" 
                      className="h-8 w-auto object-contain bg-white border border-neutral-200 rounded p-1" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-semibold text-neutral-500 truncate">Logo Uploaded</p>
                      <button
                        type="button"
                        onClick={() => {
                          handleSettingsChange('logo_url', '');
                          const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                          if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage({
                              type: 'update_site_settings',
                              settings: { ...site?.settings, logo_url: '' }
                            }, backendRootUrl);
                          }
                        }}
                        className="text-[9px] text-red-500 font-bold hover:underline"
                      >
                        Remove logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setLogoPickerOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-neutral-250 hover:border-primary hover:bg-primary/5 rounded-lg text-[10px] font-bold text-neutral-700 transition"
                    >
                      <UploadCloud className="h-3.5 w-3.5 text-neutral-400" />
                      Select/Upload Logo
                    </button>
                    
                    <MediaLibraryModal
                      isOpen={logoPickerOpen}
                      onClose={() => setLogoPickerOpen(false)}
                      onSelect={(url) => {
                        handleSettingsChange('logo_url', url);
                        // Live update the iframe preview immediately
                        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                        if (iframe && iframe.contentWindow) {
                          iframe.contentWindow.postMessage({
                            type: 'update_site_settings',
                            settings: { ...site?.settings, logo_url: url }
                          }, backendRootUrl);
                        }
                      }}
                      title="School Brand Logo Library"
                      subtitle="Upload or select a school logo from your assets"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section specific content editor form */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col min-h-0">
            {activeSectionId && activePage ? (
              <div className="flex-1 min-h-0">
                {(() => {
                  const section = activePage.sections.find(s => s.id === activeSectionId);
                  if (!section) return null;
                  
                  return (
                    <SectionEditorForm 
                      section={section} 
                      onSave={(content, style, silent) => handleSaveSection(section.id, content, style, silent)}
                      onLiveUpdate={(content, style) => handleLiveUpdate(section.id, content, style, section.type)}
                    />
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-neutral-400 space-y-2">
                <Layout className="h-8 w-8 text-neutral-300" />
                <p className="font-semibold">Direct Visual Customizer</p>
                <p className="text-[10px]">Click any element directly in the center preview window, or select a section block in the layout tree to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: New Page Setup */}
      {showNewPageModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-neutral-100">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 font-display">Add Website Page</h3>
              <p className="text-xs text-neutral-500 mt-1">Configure title and relative URL slug for the new page</p>
            </div>
            
            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Page Title</label>
                <input 
                  type="text" 
                  required
                  value={newPageTitle}
                  onChange={e => {
                    setNewPageTitle(e.target.value);
                    setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                  }}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl text-sm"
                  placeholder="e.g. Facilities"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Slug URL path</label>
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden text-sm bg-neutral-50">
                  <span className="px-3 text-neutral-400 font-mono text-xs select-none">/</span>
                  <input 
                    type="text" 
                    required
                    value={newPageSlug}
                    onChange={e => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                    className="flex-1 p-2.5 bg-transparent focus:outline-none border-l border-neutral-200"
                    placeholder="facilities"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowNewPageModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createPageMutation.isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-bold transition disabled:opacity-55"
                >
                  Create Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Publish Success Dialog */}
      {publishSuccessUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4 border border-neutral-100">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-neutral-900 font-display">Website Published Successfully!</h3>
              <p className="text-xs text-neutral-500 mt-1">Your static school portal pages have been compiled and are browseable locally</p>
            </div>

            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-left font-mono text-xs select-all overflow-x-auto">
              {backendRootUrl}{publishSuccessUrl}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button 
                onClick={() => setPublishSuccessUrl(null)}
                className="px-5 py-2.5 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold hover:bg-neutral-50 transition"
              >
                Done
              </button>
              <a 
                href={`${backendRootUrl}${publishSuccessUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setPublishSuccessUrl(null)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-bold transition shadow-lg shadow-primary/20"
              >
                Visit Site
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Popover Link Document Selector Modal */}
      <MediaLibraryModal
        isOpen={linkPopoverPickerOpen}
        onClose={() => {
          setLinkPopoverPickerOpen(false);
          setPendingLinkTarget(null);
        }}
        onSelect={handleSelectLinkFile}
        title="Document & Asset Selector"
        subtitle="Select an uploaded PDF syllabus, fee schedule, or brochure to link to this button"
      />
    </div>
  );
}

// --- Dynamic Section Editor Subform Component ---
function SectionEditorForm({ 
  section, 
  onSave, 
  onLiveUpdate 
}: { 
  section: any; 
  onSave: (content: any, style: any, silent: boolean) => void;
  onLiveUpdate: (content: any, style: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<'content' | 'layout'>('content');
  const [contentState, setContentState] = useState<any>({});
  const [styleState, setStyleState] = useState<any>({});
  const [showImagePicker, setShowImagePicker] = useState<boolean>(false);
  const [activePickerField, setActivePickerField] = useState<string | null>(null);

  // Sync section switch
  useEffect(() => {
    setContentState(section.content || {});
    setStyleState(section.style || {
      layout: 'split',
      align: 'left',
      bg_type: 'solid',
      bg_image: '',
      bg_overlay_opacity: 0.4,
      theme: 'light',
      padding: 'medium'
    });
  }, [section]);

  const handleFieldChange = (field: string, value: any) => {
    const newContent = { ...contentState, [field]: value };
    setContentState(newContent);
    onLiveUpdate(newContent, styleState);
    onSave(newContent, styleState, true); // Trigger silent background auto-save
  };

  const handleStyleChange = (field: string, value: any) => {
    const newStyle = { ...styleState, [field]: value };
    setStyleState(newStyle);
    onLiveUpdate(contentState, newStyle);
    onSave(contentState, newStyle, true); // Trigger silent background auto-save
  };

  // Image Library select handler
  const handleSelectImage = (url: string) => {
    if (activePickerField === 'bg_image') {
      handleStyleChange('bg_image', url);
    } else if (activePickerField === 'hero_image' || activePickerField === 'about_image') {
      handleFieldChange('image_url', url);
    } else if (activePickerField?.startsWith('gallery_image_')) {
      const idx = parseInt(activePickerField.split('_')[2]);
      const images = [...(contentState.images || [])];
      images[idx] = { ...images[idx], url };
      handleFieldChange('images', images);
    }
    setShowImagePicker(false);
    setActivePickerField(null);
  };

  // Layout list helpers
  const handleStatChange = (idx: number, key: string, value: any) => {
    const items = [...(contentState.items || [])];
    items[idx] = { ...items[idx], [key]: value };
    handleFieldChange('items', items);
  };

  const handleAddStat = () => {
    const items = [...(contentState.items || []), { label: 'New Metric', value: '10' }];
    handleFieldChange('items', items);
  };

  const handleRemoveStat = (idx: number) => {
    const items = (contentState.items || []).filter((_: any, i: number) => i !== idx);
    handleFieldChange('items', items);
  };

  const handleTestimonialChange = (idx: number, key: string, value: any) => {
    const items = [...(contentState.items || [])];
    items[idx] = { ...items[idx], [key]: value };
    handleFieldChange('items', items);
  };

  const handleAddTestimonial = () => {
    const items = [...(contentState.items || []), { name: 'Parent Name', role: 'Parent of Class 2', text: 'Highly recommended.' }];
    handleFieldChange('items', items);
  };

  const handleRemoveTestimonial = (idx: number) => {
    const items = (contentState.items || []).filter((_: any, i: number) => i !== idx);
    handleFieldChange('items', items);
  };

  const handleAddGalleryImage = () => {
    const images = [...(contentState.images || []), { url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600', caption: 'New Caption' }];
    handleFieldChange('images', images);
  };

  const handleRemoveGalleryImage = (idx: number) => {
    const images = (contentState.images || []).filter((_: any, i: number) => i !== idx);
    handleFieldChange('images', images);
  };

  const handleGalleryChange = (idx: number, key: string, value: any) => {
    const images = [...(contentState.images || [])];
    images[idx] = { ...images[idx], [key]: value };
    handleFieldChange('images', images);
  };

  const handleAddCustomItem = () => {
    const items = [...(contentState.items || []), { text: 'New pedagogical virtue' }];
    handleFieldChange('items', items);
  };

  const handleRemoveCustomItem = (idx: number) => {
    const items = (contentState.items || []).filter((_: any, i: number) => i !== idx);
    handleFieldChange('items', items);
  };

  const handleCustomItemChange = (idx: number, value: string) => {
    const items = [...(contentState.items || [])];
    items[idx] = { text: value };
    handleFieldChange('items', items);
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(contentState, styleState, false); // Forces full save and preview reload
  };

  return (
    <div className="space-y-4">
      {/* Configuration tabs */}
      <div className="flex border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition ${
            activeTab === 'content' ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          Content Data
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('layout')}
          className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition ${
            activeTab === 'layout' ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          Layout & Design
        </button>
      </div>

      <form onSubmit={handleManualSave} className="space-y-4">
        {/* TABS 1: CONTENT TAB */}
        {activeTab === 'content' && (
          <div className="space-y-3 pr-1 max-h-[460px] overflow-y-auto">
            {/* HERO CONFIG */}
            {section.type === 'hero' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Tagline Label</label>
                  <input 
                    type="text" 
                    value={contentState.tagline || ''} 
                    onChange={e => handleFieldChange('tagline', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Headline Text</label>
                  <input 
                    type="text" 
                    value={contentState.headline || ''} 
                    onChange={e => handleFieldChange('headline', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Subheadline Description</label>
                  <RichTextEditor 
                    value={contentState.subheadline || ''} 
                    onChange={val => handleFieldChange('subheadline', val)}
                    placeholder="Enter subheadline description..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Hero Right-Side Photo</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={contentState.image_url || ''} 
                      onChange={e => handleFieldChange('image_url', e.target.value)}
                      className="flex-1 p-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 font-mono" 
                      placeholder="Paste Unsplash URL..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActivePickerField('hero_image');
                        setShowImagePicker(true);
                      }}
                      className="px-3 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-[10px] font-bold rounded-lg transition"
                    >
                      Library
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">Btn 1 Text</label>
                    <input 
                      type="text" 
                      value={contentState.cta_primary_label || ''} 
                      onChange={e => handleFieldChange('cta_primary_label', e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">Btn 1 URL Link</label>
                    <input 
                      type="text" 
                      value={contentState.cta_primary_url || ''} 
                      onChange={e => handleFieldChange('cta_primary_url', e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">Btn 2 Text</label>
                    <input 
                      type="text" 
                      value={contentState.cta_secondary_label || ''} 
                      onChange={e => handleFieldChange('cta_secondary_label', e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">Btn 2 URL Link</label>
                    <input 
                      type="text" 
                      value={contentState.cta_secondary_url || ''} 
                      onChange={e => handleFieldChange('cta_secondary_url', e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                    />
                  </div>
                </div>
              </>
            )}

            {/* ABOUT CONFIG */}
            {section.type === 'about' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Heading Title</label>
                  <input 
                    type="text" 
                    value={contentState.heading || ''} 
                    onChange={e => handleFieldChange('heading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Paragraph Text</label>
                  <RichTextEditor 
                    value={contentState.text || ''} 
                    onChange={val => handleFieldChange('text', val)}
                    placeholder="Enter main paragraph text..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Section Side Photo</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={contentState.image_url || ''} 
                      onChange={e => handleFieldChange('image_url', e.target.value)}
                      className="flex-1 p-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 font-mono" 
                      placeholder="Paste Unsplash URL..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActivePickerField('about_image');
                        setShowImagePicker(true);
                      }}
                      className="px-3 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-[10px] font-bold rounded-lg transition"
                    >
                      Library
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* CUSTOM RICH TEXT SECTION CONFIG */}
            {section.type === 'custom' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Heading Title</label>
                  <input 
                    type="text" 
                    value={contentState.heading || ''} 
                    onChange={e => handleFieldChange('heading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Subheading</label>
                  <input 
                    type="text" 
                    value={contentState.subheading || ''} 
                    onChange={e => handleFieldChange('subheading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Paragraph Narrative</label>
                  <RichTextEditor 
                    value={contentState.paragraph || ''} 
                    onChange={val => handleFieldChange('paragraph', val)}
                    placeholder="Enter detailed narrative..."
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-neutral-500">Key Bullet Points</label>
                    <button 
                      type="button" 
                      onClick={handleAddCustomItem}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      + Add Item
                    </button>
                  </div>
                  {(contentState.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        value={item.text || ''} 
                        onChange={e => handleCustomItemChange(idx, e.target.value)}
                        className="flex-1 p-1.5 border border-neutral-200 rounded-lg text-xs bg-white" 
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(idx)}
                        className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* CONTACT CONFIG */}
            {section.type === 'contact' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Heading Title</label>
                  <input 
                    type="text" 
                    value={contentState.heading || ''} 
                    onChange={e => handleFieldChange('heading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Helpdesk Phone</label>
                  <input 
                    type="text" 
                    value={contentState.phone || ''} 
                    onChange={e => handleFieldChange('phone', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Helpdesk Email</label>
                  <input 
                    type="email" 
                    value={contentState.email || ''} 
                    onChange={e => handleFieldChange('email', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Campus Address</label>
                  <textarea 
                    value={contentState.address || ''} 
                    onChange={e => handleFieldChange('address', e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
              </>
            )}

            {/* STATS SECTION CONFIG */}
            {section.type === 'stats' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-neutral-500">Metric Counters</label>
                  <button 
                    type="button" 
                    onClick={handleAddStat}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                {(contentState.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveStat(idx)}
                      className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">Label Title</label>
                      <input 
                        type="text" 
                        value={item.label || ''} 
                        onChange={e => handleStatChange(idx, 'label', e.target.value)}
                        className="w-full p-1.5 border border-neutral-200 rounded-lg text-xs bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">Counter Value</label>
                      <input 
                        type="text" 
                        value={item.value || ''} 
                        onChange={e => handleStatChange(idx, 'value', e.target.value)}
                        className="w-full p-1.5 border border-neutral-200 rounded-lg text-xs bg-white" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TESTIMONIALS CONFIG */}
            {section.type === 'testimonials' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Heading Title</label>
                  <input 
                    type="text" 
                    value={contentState.heading || ''} 
                    onChange={e => handleFieldChange('heading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-neutral-500">Testimonials List</label>
                  <button 
                    type="button" 
                    onClick={handleAddTestimonial}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    + Add Feedback
                  </button>
                </div>
                {(contentState.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveTestimonial(idx)}
                      className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">Author Name</label>
                      <input 
                        type="text" 
                        value={item.name || ''} 
                        onChange={e => handleTestimonialChange(idx, 'name', e.target.value)}
                        className="w-full p-1.5 border border-neutral-200 rounded-lg text-xs bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">Author Role</label>
                      <input 
                        type="text" 
                        value={item.role || ''} 
                        onChange={e => handleTestimonialChange(idx, 'role', e.target.value)}
                        className="w-full p-1.5 border border-neutral-200 rounded-lg text-xs bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">Comment text</label>
                      <RichTextEditor 
                        value={item.text || ''} 
                        onChange={val => handleTestimonialChange(idx, 'text', val)}
                        placeholder="Enter testimonial text..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GALLERY CONFIG */}
            {section.type === 'gallery' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Heading Title</label>
                  <input 
                    type="text" 
                    value={contentState.heading || ''} 
                    onChange={e => handleFieldChange('heading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-neutral-500">Gallery Images</label>
                  <button 
                    type="button" 
                    onClick={handleAddGalleryImage}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    + Add Image
                  </button>
                </div>
                {(contentState.images || []).map((img: any, idx: number) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(idx)}
                      className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">Image URL</label>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={img.url || ''} 
                          onChange={e => handleGalleryChange(idx, 'url', e.target.value)}
                          className="flex-1 p-1 bg-white border border-neutral-200 rounded text-[10px] font-mono" 
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActivePickerField(`gallery_image_${idx}`);
                            setShowImagePicker(true);
                          }}
                          className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-[8px] font-bold rounded"
                        >
                          Pick
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">Image Caption</label>
                      <input 
                        type="text" 
                        value={img.caption || ''} 
                        onChange={e => handleGalleryChange(idx, 'caption', e.target.value)}
                        className="w-full p-1.5 border border-neutral-200 rounded-lg text-xs bg-white" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FACULTY CONFIG */}
            {section.type === 'faculty' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Heading Title</label>
                  <input 
                    type="text" 
                    value={contentState.heading || ''} 
                    onChange={e => handleFieldChange('heading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Section Description</label>
                  <RichTextEditor 
                    value={contentState.description || ''} 
                    onChange={val => handleFieldChange('description', val)}
                    placeholder="Enter section description..."
                  />
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 rounded-lg">
                  Note: This section automatically aggregates active teacher employee profiles from the ERP Staff Directory database.
                </div>
              </>
            )}

            {/* ADMISSIONS CONFIG */}
            {section.type === 'admissions' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Heading Title</label>
                  <input 
                    type="text" 
                    value={contentState.heading || ''} 
                    onChange={e => handleFieldChange('heading', e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">Section Description</label>
                  <RichTextEditor 
                    value={contentState.description || ''} 
                    onChange={val => handleFieldChange('description', val)}
                    placeholder="Enter section description..."
                  />
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 rounded-lg">
                  Note: This section automatically aggregates annual fee structures configured in the ERP Fees Management database.
                </div>
              </>
            )}
          </div>
        )}

        {/* TABS 2: LAYOUT & DESIGN TAB */}
        {activeTab === 'layout' && (
          <div className="space-y-4 pr-1 max-h-[460px] overflow-y-auto">
            {/* 1. Layout Preset Choice for Hero/About */}
            {(section.type === 'hero' || section.type === 'about') && (
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">Layout Preset</label>
                <select
                  value={styleState.layout || 'split'}
                  onChange={e => handleStyleChange('layout', e.target.value)}
                  className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white"
                >
                  <option value="split">Split Columns (Left Text, Right Visual)</option>
                  <option value="centered">Centered Large Banner (Text Only)</option>
                </select>
              </div>
            )}

            {/* 2. Text Alignment */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1">Text Alignment</label>
              <select
                value={styleState.align || 'left'}
                onChange={e => handleStyleChange('align', e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white"
              >
                <option value="left">Left Aligned</option>
                <option value="center">Centered</option>
                <option value="right">Right Aligned</option>
              </select>
            </div>

            {/* 3. Padding (Vertical Spacing) */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1">Vertical Spacing (Padding)</label>
              <select
                value={styleState.padding || 'medium'}
                onChange={e => handleStyleChange('padding', e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white"
              >
                <option value="small">Compact (Small Margins)</option>
                <option value="medium">Comfortable (Standard)</option>
                <option value="large">Spacious (Large Margins)</option>
              </select>
            </div>

            {/* 4. Section Theme Background */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1">Color Theme Class</label>
              <select
                value={styleState.theme || 'light'}
                onChange={e => handleStyleChange('theme', e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white"
              >
                <option value="light">Light Theme (Page Background)</option>
                <option value="dark">Dark Theme (Neutral/Slate Charcoal)</option>
                <option value="accent">Accent Theme (Brand Navy/Forest Blue)</option>
              </select>
            </div>

            {/* 5. Background Style (Solid, Gradient, Image) */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1">Background Style</label>
              <select
                value={styleState.bg_type || 'solid'}
                onChange={e => handleStyleChange('bg_type', e.target.value)}
                className="w-full p-2 border border-neutral-200 rounded-lg text-xs bg-white"
              >
                <option value="solid">Solid Theme Color</option>
                <option value="image">Custom Background Image</option>
              </select>
            </div>

            {/* 6. Background Image URL and Library Trigger */}
            {styleState.bg_type === 'image' && (
              <div className="space-y-2 border-l-2 border-neutral-200 pl-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">Background Photo URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={styleState.bg_image || ''} 
                      onChange={e => handleStyleChange('bg_image', e.target.value)}
                      className="flex-1 p-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 font-mono" 
                      placeholder="https://images.unsplash.com/..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActivePickerField('bg_image');
                        setShowImagePicker(true);
                      }}
                      className="px-3 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-[10px] font-bold rounded-lg transition"
                    >
                      Library
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-1">
                    <span>Dark Image Overlay Opacity</span>
                    <span>{Math.round((styleState.bg_overlay_opacity || 0.4) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={styleState.bg_overlay_opacity !== undefined ? styleState.bg_overlay_opacity : 0.4}
                    onChange={e => handleStyleChange('bg_overlay_opacity', parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex gap-2">
          <button 
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition shadow-lg shadow-primary/20"
          >
            <Save className="h-4 w-4" />
            Apply Changes
          </button>
        </div>
      </form>

      {/* MODAL: Centralized Media & Document Library Picker */}
      <MediaLibraryModal
        isOpen={showImagePicker}
        onClose={() => {
          setShowImagePicker(false);
          setActivePickerField(null);
        }}
        onSelect={handleSelectImage}
        title="Section Media & Document Library"
        subtitle="Manage and select images or documents for this section"
      />
    </div>
  );
}

// --- Lightweight Native HTML Rich Text Editor ---
interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Synchronize editor innerHTML with value when changed externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg: string = '') => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  return (
    <div className={`border border-neutral-200 rounded-xl overflow-hidden flex flex-col bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 p-2 bg-neutral-50 border-b border-neutral-200 shrink-0 select-none">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-neutral-900 transition flex items-center justify-center"
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-neutral-900 transition flex items-center justify-center"
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-neutral-900 transition flex items-center justify-center"
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-neutral-250 mx-1" />

        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter link URL (e.g. /published/uploads/filename.pdf or website address):');
            if (url) executeCommand('createLink', url);
          }}
          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-neutral-900 transition flex items-center justify-center"
          title="Insert Link"
        >
          <Link className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('unlink')}
          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-neutral-900 transition flex items-center justify-center"
          title="Remove Link"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </button>
        
        <div className="w-px h-4 bg-neutral-250 mx-1" />
        
        <div className="flex items-center gap-1">
          {[
            { label: 'Default', color: '#0F172A' },
            { label: 'Navy', color: '#1E40AF' },
            { label: 'Amber', color: '#F59E0B' },
            { label: 'Success', color: '#10B981' },
            { label: 'Danger', color: '#EF4444' }
          ].map(item => (
            <button
              key={item.color}
              type="button"
              onClick={() => executeCommand('foreColor', item.color)}
              className="w-3.5 h-3.5 rounded-full border border-neutral-300 hover:scale-110 transition shrink-0"
              style={{ backgroundColor: item.color }}
              title={item.label}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-neutral-250 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('removeFormat')}
          className="px-2 py-0.5 hover:bg-neutral-200 rounded-lg text-[10px] font-bold text-neutral-500 hover:text-neutral-700 transition"
          title="Clear Formatting"
        >
          Clear
        </button>
      </div>

      {/* Editable Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 text-xs min-h-[90px] max-h-[220px] overflow-y-auto focus:outline-none bg-white relative empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:pointer-events-none"
        data-placeholder={placeholder}
      />
    </div>
  );
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  subtitle?: string;
}

export function MediaLibraryModal({ isOpen, onClose, onSelect, title, subtitle }: MediaLibraryModalProps) {
  const [tab, setTab] = useState<'stock' | 'assets' | 'upload'>('stock');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadedDocUrl, setLastUploadedDocUrl] = useState<string | null>(null);

  // TanStack Query for school uploads
  const { data: uploadsRes, isLoading: uploadsLoading, refetch: refetchUploads } = useQuery({
    queryKey: ['cms_uploads'],
    queryFn: cmsApi.getUploadedFiles,
    enabled: isOpen && tab === 'assets'
  });
  const uploadedFiles = uploadsRes?.data || [];

  useEffect(() => {
    setLastUploadedDocUrl(null);
    setUploadError(null);
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    const isImage = file.type.startsWith('image/');
    const isDoc = allowedTypes.includes(file.type);
    
    if (!isImage && !isDoc) {
      setUploadError('File must be an image or a document (PDF, Word, Excel)');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const res = await cmsApi.uploadImage(file);
      if (res && res.success) {
        refetchUploads(); // Refresh list if they upload
        if (isDoc) {
          setLastUploadedDocUrl(res.url);
        } else {
          onSelect(res.url);
          onClose();
        }
      } else {
        setUploadError('Failed to upload file');
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload custom file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-neutral-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900 font-display">{title || "Media & Resource Library"}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{subtitle || "Manage school logos, photos, documents, and brochures"}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-md transition">
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 shrink-0">
          <button
            type="button"
            onClick={() => setTab('stock')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition ${
              tab === 'stock' ? 'border-primary text-primary font-display' : 'border-transparent text-neutral-400 hover:text-neutral-600 font-display'
            }`}
          >
            Stock Photos
          </button>
          <button
            type="button"
            onClick={() => setTab('assets')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition ${
              tab === 'assets' ? 'border-primary text-primary font-display' : 'border-transparent text-neutral-400 hover:text-neutral-600 font-display'
            }`}
          >
            My School Files
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition ${
              tab === 'upload' ? 'border-primary text-primary font-display' : 'border-transparent text-neutral-400 hover:text-neutral-600 font-display'
            }`}
          >
            Upload New
          </button>
        </div>

        {/* Content */}
        {tab === 'stock' ? (
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 min-h-0">
            {STOCK_IMAGES.map((img, i) => (
              <div 
                key={i}
                onClick={() => { onSelect(img.url); onClose(); }}
                className="group relative rounded-xl border border-neutral-200 overflow-hidden cursor-pointer hover:border-primary transition duration-150"
              >
                <img src={img.url} alt={img.caption} className="w-full h-24 object-cover group-hover:scale-105 transition duration-150" />
                <div className="p-2 bg-white">
                  <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase mb-1">{img.category}</span>
                  <p className="text-[9px] text-neutral-600 font-semibold truncate leading-tight">{img.caption}</p>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'assets' ? (
          uploadsLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : uploadedFiles.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 min-h-0">
              {uploadedFiles.map((file) => {
                const isImg = file.type === 'image';
                return (
                  <div
                    key={file.name}
                    onClick={() => { onSelect(file.url); onClose(); }}
                    className="group relative rounded-xl border border-neutral-200 overflow-hidden cursor-pointer hover:border-primary transition duration-150 flex flex-col bg-white"
                  >
                    {isImg ? (
                      <img src={`${backendRootUrl}${file.url}`} alt={file.name} className="w-full h-24 object-cover group-hover:scale-105 transition duration-150" />
                    ) : (
                      <div className="w-full h-24 bg-neutral-100 flex flex-col items-center justify-center group-hover:bg-neutral-200 transition">
                        <Folder className="h-10 w-10 text-neutral-400" />
                        <span className="text-[9px] text-neutral-500 font-bold uppercase mt-1">Document</span>
                      </div>
                    )}
                    <div className="p-2 border-t border-neutral-100 flex-1 flex flex-col justify-between">
                      <p className="text-[10px] text-neutral-800 font-bold truncate leading-tight mb-1" title={file.name}>{file.name}</p>
                      <div className="flex justify-between items-center text-[9px] text-neutral-400">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span className="text-[8px]">{new Date(file.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-neutral-400 p-8 space-y-2">
              <FolderOpen className="h-8 w-8 text-neutral-300" />
              <p className="font-semibold">No assets found</p>
              <p className="text-[10px] leading-relaxed">Files you upload will appear here for easy school-wide reuse.</p>
            </div>
          )
        ) : lastUploadedDocUrl ? (
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto py-8 space-y-4">
            <div className="p-4 bg-emerald-500/5 border border-emerald-250 rounded-2xl text-center space-y-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full w-10 h-10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-800">Document Uploaded Successfully!</h4>
                <p className="text-[10px] text-neutral-500 mt-0.5">Use the copied URL to attach it to headings, links or buttons in the editor.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-neutral-200 p-1.5 rounded-xl">
                <input readOnly type="text" value={`${backendRootUrl}${lastUploadedDocUrl}`} className="flex-1 p-1 bg-transparent text-[10px] font-mono focus:outline-none select-all" />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${backendRootUrl}${lastUploadedDocUrl}`);
                    alert('Copied!');
                  }}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-[9px] font-bold transition shrink-0"
                >
                  Copy
                </button>
              </div>
              <button type="button" onClick={() => setLastUploadedDocUrl(null)} className="text-[10px] text-primary font-bold hover:underline">Upload another document</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 justify-center py-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  await handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center transition ${
                dragging ? 'border-primary bg-primary/5' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100/50'
              }`}
            >
              <input
                type="file"
                id="media-library-upload-input"
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    await handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-neutral-600">Uploading file to server...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-200/50 text-neutral-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-700">Drag & drop your file or document here</p>
                    <p className="text-[10px] text-neutral-400 mt-1">Supports PNG, JPG, PDF, Word, or Excel up to 5MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('media-library-upload-input')?.click()}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition"
                  >
                    Browse Files
                  </button>
                </div>
              )}
            </div>
            {uploadError && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs font-semibold border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold hover:bg-neutral-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
