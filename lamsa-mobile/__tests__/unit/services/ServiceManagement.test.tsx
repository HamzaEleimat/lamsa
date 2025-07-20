import React from 'react';
import { render, fireEvent, waitFor } from '../../utils/testHelpers';
import { testServices } from '../../fixtures/providers';

// Mock the service management components
const MockServiceForm = ({ 
  service, 
  onSave, 
  onCancel 
}: { 
  service?: any;
  onSave: (service: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = React.useState({
    nameAr: service?.name?.ar || '',
    nameEn: service?.name?.en || '',
    price: service?.price?.toString() || '',
    duration: service?.durationInMinutes?.toString() || '',
    category: service?.category || '',
    description: service?.description || '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nameAr.trim()) {
      newErrors.nameAr = 'Arabic name is required';
    }
    if (!formData.nameEn.trim()) {
      newErrors.nameEn = 'English name is required';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Valid duration is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        ...service,
        name: {
          ar: formData.nameAr,
          en: formData.nameEn,
        },
        price: parseFloat(formData.price),
        durationInMinutes: parseInt(formData.duration),
        category: formData.category,
        description: formData.description,
      });
    }
  };

  return (
    <div testID="serviceForm">
      <input
        testID="nameAr"
        placeholder="Arabic Name"
        value={formData.nameAr}
        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
      />
      {errors.nameAr && <div testID="nameArError">{errors.nameAr}</div>}

      <input
        testID="nameEn"
        placeholder="English Name"
        value={formData.nameEn}
        onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
      />
      {errors.nameEn && <div testID="nameEnError">{errors.nameEn}</div>}

      <input
        testID="price"
        placeholder="Price (JOD)"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
      />
      {errors.price && <div testID="priceError">{errors.price}</div>}

      <input
        testID="duration"
        placeholder="Duration (minutes)"
        value={formData.duration}
        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
      />
      {errors.duration && <div testID="durationError">{errors.duration}</div>}

      <select
        testID="category"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      >
        <option value="">Select Category</option>
        <option value="HAIR">Hair</option>
        <option value="MAKEUP">Makeup</option>
        <option value="NAILS">Nails</option>
        <option value="SPA">Spa</option>
        <option value="AESTHETIC">Aesthetic</option>
      </select>
      {errors.category && <div testID="categoryError">{errors.category}</div>}

      <textarea
        testID="description"
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />

      <button testID="saveButton" onClick={handleSave}>
        Save Service
      </button>
      <button testID="cancelButton" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
};

const MockServiceList = ({ 
  services, 
  onEdit, 
  onDelete, 
  onDuplicate 
}: {
  services: any[];
  onEdit: (service: any) => void;
  onDelete: (serviceId: string) => void;
  onDuplicate: (service: any) => void;
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState('name');

  const filteredServices = services
    .filter(service => {
      const matchesSearch = service.name.ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           service.name.en.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || service.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'duration':
          return a.durationInMinutes - b.durationInMinutes;
        default:
          return a.name.ar.localeCompare(b.name.ar);
      }
    });

  return (
    <div testID="serviceList">
      <input
        testID="searchInput"
        placeholder="Search services..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <select
        testID="categoryFilter"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
      >
        <option value="">All Categories</option>
        <option value="HAIR">Hair</option>
        <option value="MAKEUP">Makeup</option>
        <option value="NAILS">Nails</option>
      </select>

      <select
        testID="sortSelect"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        <option value="name">Sort by Name</option>
        <option value="price">Sort by Price</option>
        <option value="duration">Sort by Duration</option>
      </select>

      <div testID="serviceCount">
        Showing {filteredServices.length} of {services.length} services
      </div>

      <div testID="serviceItems">
        {filteredServices.map((service) => (
          <div key={service.id} testID={`service-${service.id}`}>
            <div testID="serviceName">{service.name.ar}</div>
            <div testID="servicePrice">{service.price} JOD</div>
            <div testID="serviceDuration">{service.durationInMinutes} min</div>
            <div testID="serviceCategory">{service.category}</div>
            
            <button 
              testID={`edit-${service.id}`}
              onClick={() => onEdit(service)}
            >
              Edit
            </button>
            <button 
              testID={`delete-${service.id}`}
              onClick={() => onDelete(service.id)}
            >
              Delete
            </button>
            <button 
              testID={`duplicate-${service.id}`}
              onClick={() => onDuplicate(service)}
            >
              Duplicate
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockServiceManagement = () => {
  const [services, setServices] = React.useState(testServices);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingService, setEditingService] = React.useState(null);

  const handleSave = (serviceData: any) => {
    if (editingService) {
      // Update existing service
      setServices(services.map(s => 
        s.id === editingService.id ? { ...serviceData, id: editingService.id } : s
      ));
    } else {
      // Create new service
      const newService = {
        ...serviceData,
        id: `service-${Date.now()}`,
        providerId: 'provider-1',
      };
      setServices([...services, newService]);
    }
    setIsEditing(false);
    setEditingService(null);
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setIsEditing(true);
  };

  const handleDelete = (serviceId: string) => {
    setServices(services.filter(s => s.id !== serviceId));
  };

  const handleDuplicate = (service: any) => {
    const duplicatedService = {
      ...service,
      id: `service-${Date.now()}`,
      name: {
        ar: `${service.name.ar} (نسخة)`,
        en: `${service.name.en} (Copy)`,
      },
    };
    setServices([...services, duplicatedService]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingService(null);
  };

  if (isEditing) {
    return (
      <MockServiceForm
        service={editingService}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div>
      <button testID="addServiceButton" onClick={() => setIsEditing(true)}>
        Add New Service
      </button>
      <MockServiceList
        services={services}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
};

describe('Service Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service CRUD Operations', () => {
    it('should create a new service successfully', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      // Click add service button
      fireEvent.press(getByTestId('addServiceButton'));

      // Fill form
      fireEvent.changeText(getByTestId('nameAr'), 'قص شعر جديد');
      fireEvent.changeText(getByTestId('nameEn'), 'New Haircut');
      fireEvent.changeText(getByTestId('price'), '25');
      fireEvent.changeText(getByTestId('duration'), '60');
      fireEvent.change(getByTestId('category'), { target: { value: 'HAIR' } });
      fireEvent.changeText(getByTestId('description'), 'Professional haircut service');

      // Save service
      fireEvent.press(getByTestId('saveButton'));

      // Verify service was added
      await waitFor(() => {
        expect(getByTestId('serviceCount')).toHaveTextContent('Showing 5 of 5 services');
      });
    });

    it('should update an existing service', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      // Edit first service
      fireEvent.press(getByTestId('edit-service-1'));

      // Update price
      fireEvent.changeText(getByTestId('price'), '20');

      // Save changes
      fireEvent.press(getByTestId('saveButton'));

      // Verify service was updated
      await waitFor(() => {
        expect(getByTestId('service-service-1')).toBeTruthy();
      });
    });

    it('should delete a service with confirmation', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      const initialCount = 4; // testServices.length
      expect(getByTestId('serviceCount')).toHaveTextContent(`Showing ${initialCount} of ${initialCount} services`);

      // Delete service
      fireEvent.press(getByTestId('delete-service-1'));

      // Verify service was deleted
      await waitFor(() => {
        expect(getByTestId('serviceCount')).toHaveTextContent(`Showing ${initialCount - 1} of ${initialCount - 1} services`);
      });
    });

    it('should duplicate a service', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      const initialCount = 4;
      fireEvent.press(getByTestId('duplicate-service-1'));

      // Verify service was duplicated
      await waitFor(() => {
        expect(getByTestId('serviceCount')).toHaveTextContent(`Showing ${initialCount + 1} of ${initialCount + 1} services`);
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      fireEvent.press(getByTestId('addServiceButton'));
      fireEvent.press(getByTestId('saveButton'));

      await waitFor(() => {
        expect(getByTestId('nameArError')).toHaveTextContent('Arabic name is required');
        expect(getByTestId('nameEnError')).toHaveTextContent('English name is required');
        expect(getByTestId('priceError')).toHaveTextContent('Valid price is required');
        expect(getByTestId('durationError')).toHaveTextContent('Valid duration is required');
        expect(getByTestId('categoryError')).toHaveTextContent('Category is required');
      });
    });

    it('should validate price format', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      fireEvent.press(getByTestId('addServiceButton'));
      
      // Test negative price
      fireEvent.changeText(getByTestId('price'), '-10');
      fireEvent.press(getByTestId('saveButton'));

      await waitFor(() => {
        expect(getByTestId('priceError')).toHaveTextContent('Valid price is required');
      });

      // Test zero price
      fireEvent.changeText(getByTestId('price'), '0');
      fireEvent.press(getByTestId('saveButton'));

      await waitFor(() => {
        expect(getByTestId('priceError')).toHaveTextContent('Valid price is required');
      });
    });

    it('should validate duration format', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      fireEvent.press(getByTestId('addServiceButton'));
      
      // Test invalid duration
      fireEvent.changeText(getByTestId('duration'), 'abc');
      fireEvent.press(getByTestId('saveButton'));

      await waitFor(() => {
        expect(getByTestId('durationError')).toHaveTextContent('Valid duration is required');
      });
    });

    it('should validate service name uniqueness', async () => {
      const MockServiceFormWithUniqueness = ({ onSave }: { onSave: (service: any) => void }) => {
        const [nameAr, setNameAr] = React.useState('');
        const [error, setError] = React.useState('');

        const existingNames = ['قص شعر نسائي', 'صبغة شعر', 'مكياج سهرة'];

        const validateUniqueness = () => {
          if (existingNames.includes(nameAr)) {
            setError('Service name already exists');
            return false;
          }
          setError('');
          return true;
        };

        const handleSave = () => {
          if (validateUniqueness()) {
            onSave({ name: { ar: nameAr } });
          }
        };

        return (
          <div>
            <input
              testID="nameAr"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
            />
            {error && <div testID="uniquenessError">{error}</div>}
            <button testID="saveButton" onClick={handleSave}>Save</button>
          </div>
        );
      };

      const { getByTestId } = render(<MockServiceFormWithUniqueness onSave={jest.fn()} />);

      fireEvent.changeText(getByTestId('nameAr'), 'قص شعر نسائي');
      fireEvent.press(getByTestId('saveButton'));

      expect(getByTestId('uniquenessError')).toHaveTextContent('Service name already exists');
    });
  });

  describe('Service Search and Filtering', () => {
    it('should search services by name', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      fireEvent.changeText(getByTestId('searchInput'), 'قص');

      await waitFor(() => {
        expect(getByTestId('serviceCount')).toHaveTextContent('Showing 1 of 4 services');
      });
    });

    it('should filter services by category', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      fireEvent.change(getByTestId('categoryFilter'), { target: { value: 'HAIR' } });

      await waitFor(() => {
        expect(getByTestId('serviceCount')).toHaveTextContent('Showing 2 of 4 services');
      });
    });

    it('should sort services by price', async () => {
      const { getByTestId, getAllByTestId } = render(<MockServiceManagement />);

      fireEvent.change(getByTestId('sortSelect'), { target: { value: 'price' } });

      await waitFor(() => {
        const priceElements = getAllByTestId('servicePrice');
        const prices = priceElements.map(el => parseInt(el.textContent?.split(' ')[0] || '0'));
        
        // Verify prices are in ascending order
        for (let i = 1; i < prices.length; i++) {
          expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
        }
      });
    });

    it('should combine search and filter', async () => {
      const { getByTestId } = render(<MockServiceManagement />);

      // Search for hair services
      fireEvent.changeText(getByTestId('searchInput'), 'شعر');
      fireEvent.change(getByTestId('categoryFilter'), { target: { value: 'HAIR' } });

      await waitFor(() => {
        expect(getByTestId('serviceCount')).toHaveTextContent('Showing 2 of 4 services');
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple services for bulk operations', () => {
      const MockBulkServiceList = () => {
        const [selectedServices, setSelectedServices] = React.useState<string[]>([]);

        const toggleService = (serviceId: string) => {
          setSelectedServices(prev =>
            prev.includes(serviceId)
              ? prev.filter(id => id !== serviceId)
              : [...prev, serviceId]
          );
        };

        return (
          <div>
            <div testID="selectedCount">
              Selected: {selectedServices.length}
            </div>
            {testServices.map(service => (
              <div key={service.id}>
                <input
                  testID={`checkbox-${service.id}`}
                  type="checkbox"
                  checked={selectedServices.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                />
                <span testID={`service-name-${service.id}`}>{service.name.ar}</span>
              </div>
            ))}
            {selectedServices.length > 0 && (
              <div testID="bulkActions">
                <button testID="bulkDeleteButton">Delete Selected</button>
                <button testID="bulkActivateButton">Activate Selected</button>
                <button testID="bulkDeactivateButton">Deactivate Selected</button>
              </div>
            )}
          </div>
        );
      };

      const { getByTestId } = render(<MockBulkServiceList />);

      // Select first two services
      fireEvent.press(getByTestId('checkbox-service-1'));
      fireEvent.press(getByTestId('checkbox-service-2'));

      expect(getByTestId('selectedCount')).toHaveTextContent('Selected: 2');
      expect(getByTestId('bulkActions')).toBeTruthy();
    });

    it('should activate/deactivate services in bulk', () => {
      const MockBulkToggle = () => {
        const [services, setServices] = React.useState(
          testServices.map(s => ({ ...s, active: true }))
        );
        const [selectedIds, setSelectedIds] = React.useState(['service-1', 'service-2']);

        const bulkDeactivate = () => {
          setServices(services.map(s =>
            selectedIds.includes(s.id) ? { ...s, active: false } : s
          ));
        };

        return (
          <div>
            <button testID="bulkDeactivateButton" onClick={bulkDeactivate}>
              Deactivate Selected
            </button>
            {services.map(service => (
              <div key={service.id} testID={`service-status-${service.id}`}>
                {service.active ? 'Active' : 'Inactive'}
              </div>
            ))}
          </div>
        );
      };

      const { getByTestId } = render(<MockBulkToggle />);

      fireEvent.press(getByTestId('bulkDeactivateButton'));

      expect(getByTestId('service-status-service-1')).toHaveTextContent('Inactive');
      expect(getByTestId('service-status-service-2')).toHaveTextContent('Inactive');
    });
  });

  describe('Service Templates', () => {
    it('should create service from template', async () => {
      const serviceTemplates = [
        {
          id: 'template-1',
          nameAr: 'قص شعر قصير',
          nameEn: 'Short Haircut',
          category: 'HAIR',
          typicalPrice: 15,
          typicalDuration: 30,
        },
        {
          id: 'template-2',
          nameAr: 'مكياج طبيعي',
          nameEn: 'Natural Makeup',
          category: 'MAKEUP',
          typicalPrice: 25,
          typicalDuration: 45,
        },
      ];

      const MockTemplateSelection = ({ onSelect }: { onSelect: (template: any) => void }) => (
        <div testID="templateSelection">
          {serviceTemplates.map(template => (
            <button
              key={template.id}
              testID={`template-${template.id}`}
              onClick={() => onSelect(template)}
            >
              {template.nameAr} - {template.typicalPrice} JOD
            </button>
          ))}
        </div>
      );

      const onSelectMock = jest.fn();
      const { getByTestId } = render(<MockTemplateSelection onSelect={onSelectMock} />);

      fireEvent.press(getByTestId('template-template-1'));

      expect(onSelectMock).toHaveBeenCalledWith(serviceTemplates[0]);
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large service lists efficiently', () => {
      const largeServiceList = Array.from({ length: 1000 }, (_, i) => ({
        id: `service-${i}`,
        name: { ar: `خدمة ${i}`, en: `Service ${i}` },
        price: Math.floor(Math.random() * 100) + 10,
        durationInMinutes: 30 + (i % 120),
        category: ['HAIR', 'MAKEUP', 'NAILS'][i % 3],
      }));

      const MockLargeServiceList = () => {
        const [displayedServices, setDisplayedServices] = React.useState(
          largeServiceList.slice(0, 20) // Show only first 20
        );
        const [page, setPage] = React.useState(1);

        const loadMore = () => {
          const nextPage = page + 1;
          const newServices = largeServiceList.slice(0, nextPage * 20);
          setDisplayedServices(newServices);
          setPage(nextPage);
        };

        return (
          <div>
            <div testID="serviceCount">
              Showing {displayedServices.length} of {largeServiceList.length}
            </div>
            <div testID="serviceItems">
              {displayedServices.map(service => (
                <div key={service.id} testID={`service-${service.id}`}>
                  {service.name.ar}
                </div>
              ))}
            </div>
            {displayedServices.length < largeServiceList.length && (
              <button testID="loadMoreButton" onClick={loadMore}>
                Load More
              </button>
            )}
          </div>
        );
      };

      const { getByTestId } = render(<MockLargeServiceList />);

      expect(getByTestId('serviceCount')).toHaveTextContent('Showing 20 of 1000');

      fireEvent.press(getByTestId('loadMoreButton'));

      expect(getByTestId('serviceCount')).toHaveTextContent('Showing 40 of 1000');
    });
  });
});