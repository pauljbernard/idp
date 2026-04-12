/**
 * MissionService - Workflow orchestration and mission lifecycle management
 *
 * This service provides:
 * - Mission and workflow creation, editing, and lifecycle management
 * - Template and pattern libraries
 * - Recurring scheduling
 * - Search, filtering, and sorting
 * - Collaboration and documentation
 * - Status tracking and analytics
 */

export interface MissionLocation {
  lat: number;
  lon: number;
  address?: string;
  name?: string;
}

export interface MissionGeometry {
  type: 'point' | 'area' | 'corridor' | 'route';
  coordinates: number[] | number[][] | number[][][];
  center?: [number, number];
  radius?: number; // meters
  altitude_profile?: {
    takeoff: number;
    max: number;
    landing: number;
  };
}

export interface MissionTemplate {
  id: string;
  tenant_id?: string;
  name: string;
  description: string;
  category: 'inspection' | 'surveillance' | 'mapping' | 'delivery' | 'search_rescue' | 'photography' | 'custom';
  geometry_type: 'point' | 'area' | 'corridor' | 'route';
  default_priority?: Mission['priority'];
  default_altitude: number;
  estimated_duration: number; // minutes
  required_equipment: string[];
  weather_requirements: {
    max_wind_speed: number;
    min_visibility: number;
    precipitation_allowed: boolean;
  };
  regulatory_notes: string;
  checklist_items: string[];
  tags?: string[];
  recommended_recurrence?: Mission['recurrence_pattern'];
  created_by: string;
  created_at: string;
  updated_at?: string;
  usage_count: number;
  template_version?: number;
  is_system_template?: boolean;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'planned' | 'approved' | 'active' | 'completed' | 'canceled' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'inspection' | 'surveillance' | 'mapping' | 'delivery' | 'search_rescue' | 'photography' | 'custom';

  // Location and geometry
  location: MissionLocation;
  geometry: MissionGeometry;

  // Timing
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  estimated_duration: number; // minutes

  // Resources
  assigned_pilot: string;
  assigned_specialist?: string;
  assigned_aircraft: string;
  assigned_resource?: string;
  required_equipment: string[];

  // Planning
  weather_requirements: {
    max_wind_speed: number;
    min_visibility: number;
    precipitation_allowed: boolean;
  };
  authorization_required: boolean;
  authorization_status?: 'pending' | 'approved' | 'denied';
  authorization_details?: string;

  // Collaboration and tracking
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  shared_with: string[];
  notes: MissionNote[];
  attachments: MissionAttachment[];

  // Recurring mission data
  is_recurring: boolean;
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    interval: number;
    days_of_week?: number[]; // 0-6, Sunday=0
    end_date?: string;
    max_occurrences?: number;
  };
  parent_mission_id?: string; // For recurring instances

  // Template reference
  template_id?: string;
  template_version?: number;

  // Performance data
  flight_data?: {
    distance_flown: number; // meters
    max_altitude: number;
    battery_used: number; // percentage
    weather_conditions: string;
  };

  // Metadata
  tags: string[];
  custom_fields: Record<string, any>;
}

export interface MissionNote {
  id: string;
  mission_id: string;
  author: string;
  content: string;
  type: 'general' | 'weather' | 'safety' | 'technical' | 'regulatory';
  created_at: string;
  updated_at?: string;
}

export interface MissionAttachment {
  id: string;
  mission_id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'data';
  size: number;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface MissionSearchFilters {
  status?: Mission['status'][];
  type?: Mission['type'][];
  priority?: Mission['priority'][];
  date_range?: {
    start: string;
    end: string;
  };
  pilot?: string;
  specialist?: string;
  aircraft?: string;
  resource?: string;
  location_radius?: {
    lat: number;
    lon: number;
    radius_km: number;
  };
  tags?: string[];
  text_search?: string;
}

export interface MissionSortOptions {
  field: 'name' | 'status' | 'scheduled_start' | 'priority' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

export class MissionService {
  private missions: Map<string, Mission> = new Map();
  private templates: Map<string, MissionTemplate> = new Map();
  private subscribers: Set<(missions: Mission[]) => void> = new Set();

  constructor() {
    this.initializeMockData();
  }

  private syncMissionAliases(mission: Mission): Mission {
    return {
      ...mission,
      assigned_specialist: mission.assigned_specialist ?? mission.assigned_pilot,
      assigned_resource: mission.assigned_resource ?? mission.assigned_aircraft,
    };
  }

  /**
   * Create a new mission
   */
  async createMission(missionData: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'notes' | 'attachments'>): Promise<Mission> {
    const mission: Mission = this.syncMissionAliases({
      ...missionData,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: [],
      attachments: []
    });

    this.missions.set(mission.id, mission);
    this.notifySubscribers();

    // If this is a recurring mission, schedule future instances
    if (mission.is_recurring && mission.recurrence_pattern) {
      await this.createRecurringInstances(mission);
    }

    return mission;
  }

  /**
   * Create mission from template
   */
  async createMissionFromTemplate(
    templateId: string,
    overrides: Partial<Omit<Mission, 'id' | 'template_id' | 'created_at' | 'updated_at'>>
  ): Promise<Mission> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const baseMission: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'notes' | 'attachments'> = {
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      description: template.description,
      status: 'draft',
      priority: 'medium',
      type: template.category as Mission['type'],
      location: { lat: 37.7749, lon: -122.4194, name: 'Default Location' },
      geometry: {
        type: template.geometry_type,
        coordinates: [],
        altitude_profile: {
          takeoff: 0,
          max: template.default_altitude,
          landing: 0
        }
      },
      scheduled_start: new Date().toISOString(),
      scheduled_end: new Date(Date.now() + template.estimated_duration * 60000).toISOString(),
      estimated_duration: template.estimated_duration,
      assigned_pilot: 'current_user',
      assigned_aircraft: 'default_aircraft',
      required_equipment: template.required_equipment,
      weather_requirements: template.weather_requirements,
      authorization_required: false,
      created_by: 'current_user',
      updated_by: 'current_user',
      shared_with: [],
      is_recurring: false,
      template_id: templateId,
      template_version: 1,
      tags: [template.category],
      custom_fields: {},
      ...overrides
    };

    // Update template usage count
    template.usage_count++;
    this.templates.set(templateId, template);

    return this.createMission(baseMission);
  }

  /**
   * Update an existing mission
   */
  async updateMission(missionId: string, updates: Partial<Mission>): Promise<Mission> {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const updatedMission: Mission = {
      ...mission,
      ...updates,
      id: missionId, // Prevent ID changes
      updated_at: new Date().toISOString()
    };

    const syncedMission = this.syncMissionAliases(updatedMission);

    this.missions.set(missionId, syncedMission);
    this.notifySubscribers();

    return syncedMission;
  }

  /**
   * Delete a mission
   */
  async deleteMission(missionId: string): Promise<void> {
    if (!this.missions.has(missionId)) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    this.missions.delete(missionId);
    this.notifySubscribers();
  }

  /**
   * Get mission by ID
   */
  async getMission(missionId: string): Promise<Mission | null> {
    const mission = this.missions.get(missionId);
    return mission ? this.syncMissionAliases(mission) : null;
  }

  /**
   * Search and filter missions
   */
  async searchMissions(
    filters?: MissionSearchFilters,
    sort?: MissionSortOptions,
    limit?: number,
    offset?: number
  ): Promise<{ missions: Mission[]; total: number }> {
    let missions = Array.from(this.missions.values());

    // Apply filters
    if (filters) {
      missions = missions.filter(mission => {
        if (filters.status && !filters.status.includes(mission.status)) return false;
        if (filters.type && !filters.type.includes(mission.type)) return false;
        if (filters.priority && !filters.priority.includes(mission.priority)) return false;

        if (filters.date_range) {
          const missionDate = new Date(mission.scheduled_start);
          const startDate = new Date(filters.date_range.start);
          const endDate = new Date(filters.date_range.end);
          if (missionDate < startDate || missionDate > endDate) return false;
        }

        const requestedSpecialist = filters.specialist ?? filters.pilot;
        if (requestedSpecialist && mission.assigned_pilot !== requestedSpecialist && mission.assigned_specialist !== requestedSpecialist) return false;

        const requestedResource = filters.resource ?? filters.aircraft;
        if (requestedResource && mission.assigned_aircraft !== requestedResource && mission.assigned_resource !== requestedResource) return false;

        if (filters.location_radius) {
          const distance = this.calculateDistance(
            mission.location.lat,
            mission.location.lon,
            filters.location_radius.lat,
            filters.location_radius.lon
          );
          if (distance > filters.location_radius.radius_km) return false;
        }

        if (filters.tags && !filters.tags.some(tag => mission.tags.includes(tag))) return false;

        if (filters.text_search) {
          const searchText = filters.text_search.toLowerCase();
          const searchFields = [mission.name, mission.description, mission.location.name].join(' ').toLowerCase();
          if (!searchFields.includes(searchText)) return false;
        }

        return true;
      });
    }

    // Apply sorting
    if (sort) {
      missions.sort((a, b) => {
        const aValue = a[sort.field];
        const bValue = b[sort.field];

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = missions.length;

    // Apply pagination
    if (offset !== undefined && limit !== undefined) {
      missions = missions.slice(offset, offset + limit);
    }

    return { missions: missions.map((mission) => this.syncMissionAliases(mission)), total };
  }

  /**
   * Get upcoming missions (next 7 days)
   */
  async getUpcomingMissions(limit: number = 10): Promise<Mission[]> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { missions } = await this.searchMissions(
      {
        status: ['planned', 'approved'],
        date_range: {
          start: new Date().toISOString(),
          end: sevenDaysFromNow.toISOString()
        }
      },
      { field: 'scheduled_start', direction: 'asc' },
      limit
    );

    return missions;
  }

  /**
   * Add note to mission
   */
  async addMissionNote(missionId: string, note: Omit<MissionNote, 'id' | 'mission_id' | 'created_at'>): Promise<MissionNote> {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const newNote: MissionNote = {
      ...note,
      id: this.generateId(),
      mission_id: missionId,
      created_at: new Date().toISOString()
    };

    mission.notes.push(newNote);
    mission.updated_at = new Date().toISOString();

    this.missions.set(missionId, this.syncMissionAliases(mission));
    this.notifySubscribers();

    return newNote;
  }

  /**
   * Share mission with users
   */
  async shareMission(missionId: string, userIds: string[]): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    mission.shared_with = [...new Set([...mission.shared_with, ...userIds])];
    mission.updated_at = new Date().toISOString();

    this.missions.set(missionId, this.syncMissionAliases(mission));
    this.notifySubscribers();
  }

  /**
   * Duplicate mission
   */
  async duplicateMission(missionId: string, overrides?: Partial<Mission>): Promise<Mission> {
    const originalMission = this.missions.get(missionId);
    if (!originalMission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const duplicatedMissionData: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'notes' | 'attachments'> = {
      ...originalMission,
      name: `${originalMission.name} (Copy)`,
      status: 'draft',
      actual_start: undefined,
      actual_end: undefined,
      flight_data: undefined,
      ...overrides
    };

    // Remove fields that shouldn't be copied
    delete (duplicatedMissionData as any).id;
    delete (duplicatedMissionData as any).created_at;
    delete (duplicatedMissionData as any).updated_at;
    delete (duplicatedMissionData as any).notes;
    delete (duplicatedMissionData as any).attachments;

    return this.createMission(duplicatedMissionData);
  }

  /**
   * Get mission templates
   */
  async getTemplates(category?: string): Promise<MissionTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(template => template.category === category);
    }

    return templates.sort((a, b) => b.usage_count - a.usage_count);
  }

  /**
   * Create mission template
   */
  async createTemplate(templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'usage_count'>): Promise<MissionTemplate> {
    const template: MissionTemplate = {
      ...templateData,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      usage_count: 0
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Subscribe to mission updates
   */
  subscribe(callback: (missions: Mission[]) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get mission statistics
   */
  async getMissionStatistics(): Promise<{
    total: number;
    by_status: Record<Mission['status'], number>;
    by_type: Record<Mission['type'], number>;
    upcoming_count: number;
    completed_this_month: number;
  }> {
    const missions = Array.from(this.missions.values());
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: missions.length,
      by_status: {} as Record<Mission['status'], number>,
      by_type: {} as Record<Mission['type'], number>,
      upcoming_count: 0,
      completed_this_month: 0
    };

    missions.forEach(mission => {
      // Count by status
      stats.by_status[mission.status] = (stats.by_status[mission.status] || 0) + 1;

      // Count by type
      stats.by_type[mission.type] = (stats.by_type[mission.type] || 0) + 1;

      // Count upcoming (next 7 days)
      const scheduledDate = new Date(mission.scheduled_start);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      if (scheduledDate >= now && scheduledDate <= sevenDaysFromNow &&
          (mission.status === 'planned' || mission.status === 'approved')) {
        stats.upcoming_count++;
      }

      // Count completed this month
      if (mission.status === 'completed' && mission.actual_end) {
        const completedDate = new Date(mission.actual_end);
        if (completedDate >= startOfMonth) {
          stats.completed_this_month++;
        }
      }
    });

    return stats;
  }

  // Private methods

  private generateId(): string {
    return 'mission_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async createRecurringInstances(parentMission: Mission): Promise<void> {
    if (!parentMission.recurrence_pattern) return;

    const pattern = parentMission.recurrence_pattern;
    const maxInstances = pattern.max_occurrences || 52; // Default to 52 weeks
    const endDate = pattern.end_date ? new Date(pattern.end_date) : new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // Default to 1 year

    let currentDate = new Date(parentMission.scheduled_start);
    let instanceCount = 0;

    while (instanceCount < maxInstances && currentDate <= endDate) {
      // Calculate next occurrence based on frequency
      switch (pattern.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + pattern.interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (pattern.interval * 7));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + pattern.interval);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + (pattern.interval * 3));
          break;
      }

      // Check day of week filter for weekly patterns
      if (pattern.days_of_week && pattern.frequency === 'weekly') {
        if (!pattern.days_of_week.includes(currentDate.getDay())) {
          continue;
        }
      }

      const scheduledEnd = new Date(currentDate);
      scheduledEnd.setTime(scheduledEnd.getTime() + parentMission.estimated_duration * 60000);

      const instanceMission: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'notes' | 'attachments'> = {
        ...parentMission,
        name: `${parentMission.name} (${currentDate.toLocaleDateString()})`,
        scheduled_start: currentDate.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        parent_mission_id: parentMission.id,
        is_recurring: false, // Instances are not recurring themselves
        recurrence_pattern: undefined
      };

      await this.createMission(instanceMission);
      instanceCount++;
    }
  }

  private notifySubscribers(): void {
    const missions = Array.from(this.missions.values()).map((mission) => this.syncMissionAliases(mission));
    this.subscribers.forEach(callback => callback(missions));
  }

  private initializeMockData(): void {
    // Create sample templates
    const templates: MissionTemplate[] = [
      {
        id: 'template_inspection',
        name: 'Infrastructure Inspection',
        description: 'Standard template for infrastructure inspection missions',
        category: 'inspection',
        geometry_type: 'area',
        default_altitude: 150,
        estimated_duration: 45,
        required_equipment: ['HD Camera', 'Gimbal', 'Obstacle Avoidance'],
        weather_requirements: {
          max_wind_speed: 15,
          min_visibility: 5,
          precipitation_allowed: false
        },
        regulatory_notes: 'Requires visual line of sight. Check for restricted airspace.',
        checklist_items: [
          'Pre-flight inspection completed',
          'Weather conditions verified',
          'Airspace clearance confirmed',
          'Emergency procedures reviewed'
        ],
        created_by: 'system',
        created_at: '2026-01-01T00:00:00Z',
        usage_count: 15
      },
      {
        id: 'template_mapping',
        name: 'Aerial Mapping Survey',
        description: 'Template for comprehensive aerial mapping and photogrammetry',
        category: 'mapping',
        geometry_type: 'area',
        default_altitude: 200,
        estimated_duration: 60,
        required_equipment: ['Survey Camera', 'GPS RTK', 'Data Logger'],
        weather_requirements: {
          max_wind_speed: 12,
          min_visibility: 8,
          precipitation_allowed: false
        },
        regulatory_notes: 'May require LAANC authorization for altitudes above 150ft.',
        checklist_items: [
          'Flight pattern programmed',
          'Ground control points established',
          'Camera calibration verified',
          'Data storage confirmed'
        ],
        created_by: 'system',
        created_at: '2026-01-01T00:00:00Z',
        usage_count: 8
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Create sample missions
    const sampleMissions: Mission[] = [
      {
        id: 'mission_001',
        name: 'Bridge Inspection - Golden Gate',
        description: 'Monthly routine inspection of Golden Gate Bridge structure',
        status: 'planned',
        priority: 'high',
        type: 'inspection',
        location: {
          lat: 37.8199,
          lon: -122.4783,
          address: 'Golden Gate Bridge, San Francisco, CA',
          name: 'Golden Gate Bridge'
        },
        geometry: {
          type: 'corridor',
          coordinates: [[-122.4783, 37.8199], [-122.4783, 37.8199]],
          altitude_profile: {
            takeoff: 0,
            max: 200,
            landing: 0
          }
        },
        scheduled_start: '2026-03-15T08:00:00Z',
        scheduled_end: '2026-03-15T09:30:00Z',
        estimated_duration: 90,
        assigned_pilot: 'pilot_001',
        assigned_aircraft: 'drone_001',
        required_equipment: ['HD Camera', 'Thermal Sensor'],
        weather_requirements: {
          max_wind_speed: 20,
          min_visibility: 5,
          precipitation_allowed: false
        },
        authorization_required: true,
        authorization_status: 'approved',
        created_by: 'user_001',
        created_at: '2026-03-10T10:00:00Z',
        updated_by: 'user_001',
        updated_at: '2026-03-12T14:30:00Z',
        shared_with: ['supervisor_001', 'team_lead_001'],
        notes: [
          {
            id: 'note_001',
            mission_id: 'mission_001',
            author: 'user_001',
            content: 'Weather forecast looks favorable. Expect light winds.',
            type: 'weather',
            created_at: '2026-03-12T14:30:00Z'
          }
        ],
        attachments: [],
        is_recurring: true,
        recurrence_pattern: {
          frequency: 'monthly',
          interval: 1
        },
        template_id: 'template_inspection',
        tags: ['infrastructure', 'bridge', 'monthly'],
        custom_fields: {
          permit_number: 'SF-BRIDGE-2026-001',
          safety_contact: 'safety@bridge.authority.gov'
        }
      }
    ];

    sampleMissions.forEach(mission => {
      this.missions.set(mission.id, this.syncMissionAliases(mission));
    });
  }
}

// Default mission service instance
export const missionService = new MissionService();
