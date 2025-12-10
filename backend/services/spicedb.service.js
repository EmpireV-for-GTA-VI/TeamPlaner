/**
 * ============================================================================
 * SpiceDB Service - Der "Wächter" (Updated for SDK v1.0+)
 * ============================================================================
 */

const { AuthzedClient, ClientSecurity, v1 } = require('@authzed/authzed-node');

class SpiceDBService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.failClosed = true; // Bei Fehler: Zugriff verweigern
    }

    /**
     * Initialisierung der SpiceDB-Verbindung
     */
    async connect() {
        try {
            const endpoint = process.env.SPICEDB_ENDPOINT || 'localhost:50051';
            const token = process.env.SPICEDB_TOKEN || 'insecure-token';

            // Neue Syntax für authzed-node v1+
            this.client = new AuthzedClient({
                token: token,
                endpoint: endpoint,
                security: ClientSecurity.INSECURE_PLAINTEXT_CREDENTIALS
            });

            // Test-Verbindung
            await this.healthCheck();
            this.isConnected = true;
            console.log('SpiceDB: Connected');
        } catch (error) {
            console.error('SpiceDB connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Health Check
     */
    async healthCheck() {
        try {
            const request = v1.CheckPermissionRequest.create({
                consistency: { requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true } },
                resource: v1.ObjectReference.create({
                    objectType: 'user',
                    objectId: 'health-check'
                }),
                permission: 'view',
                subject: v1.SubjectReference.create({
                    object: v1.ObjectReference.create({
                        objectType: 'user',
                        objectId: 'health-check'
                    })
                })
            });

            // Hinweis: In v1 ist .permissions. nicht mehr nötig, Methoden sind direkt am Client
            await this.client.checkPermission(request);
            return true;
        } catch (error) {
            // Ignoriere Fehler, wenn es nur am fehlenden Schema liegt (beim allerersten Start)
            if (error.message && error.message.includes('object definition not found')) {
                return true; 
            }
            console.error('SpiceDB health check failed:', error);
            return false;
        }
    }

    // ========================================================================
    // PERMISSION CHECKS
    // ========================================================================

    async checkPermission(userId, permission, resourceType, resourceId) {
        if (!this.isConnected && this.failClosed) {
            console.error('SpiceDB not connected - FAIL CLOSED');
            throw new Error('Permission service unavailable - access denied');
        }

        try {
            const request = v1.CheckPermissionRequest.create({
                consistency: { requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true } },
                resource: v1.ObjectReference.create({
                    objectType: resourceType,
                    objectId: resourceId
                }),
                permission: permission,
                subject: v1.SubjectReference.create({
                    object: v1.ObjectReference.create({
                        objectType: 'user',
                        objectId: userId
                    })
                })
            });

            const response = await this.client.checkPermission(request);
            const hasPermission = response.permissionship === v1.CheckPermissionResponse_Permissionship.HAS_PERMISSION;

            console.log(`Permission Check: user:${userId} ${permission} ${resourceType}:${resourceId} = ${hasPermission}`);
            return hasPermission;

        } catch (error) {
            console.error('SpiceDB permission check failed:', error);
            if (this.failClosed) throw new Error('Permission check failed - access denied');
            return false;
        }
    }

    async checkPermissions(userId, permission, resources) {
        const results = new Map();
        const promises = resources.map(async (resource) => {
            const hasPermission = await this.checkPermission(userId, permission, resource.type, resource.id);
            return { id: resource.id, hasPermission };
        });

        const responses = await Promise.all(promises);
        responses.forEach(({ id, hasPermission }) => results.set(id, hasPermission));
        return results;
    }

    // ========================================================================
    // RELATIONSHIP MANAGEMENT
    // ========================================================================

    async createRelationship(resourceType, resourceId, relation, subjectType, subjectId) {
        try {
            const request = v1.WriteRelationshipsRequest.create({
                updates: [
                    v1.RelationshipUpdate.create({
                        operation: v1.RelationshipUpdate_Operation.TOUCH,
                        relationship: v1.Relationship.create({
                            resource: v1.ObjectReference.create({
                                objectType: resourceType,
                                objectId: resourceId
                            }),
                            relation: relation,
                            subject: v1.SubjectReference.create({
                                object: v1.ObjectReference.create({
                                    objectType: subjectType,
                                    objectId: subjectId
                                })
                            })
                        })
                    })
                ]
            });

            await this.client.writeRelationships(request);
            console.log(`Relationship created: ${subjectType}:${subjectId}#${relation}@${resourceType}:${resourceId}`);
        } catch (error) {
            console.error('Failed to create relationship:', error);
            throw error;
        }
    }

    async deleteRelationship(resourceType, resourceId, relation, subjectType, subjectId) {
        try {
            const request = v1.WriteRelationshipsRequest.create({
                updates: [
                    v1.RelationshipUpdate.create({
                        operation: v1.RelationshipUpdate_Operation.DELETE,
                        relationship: v1.Relationship.create({
                            resource: v1.ObjectReference.create({
                                objectType: resourceType,
                                objectId: resourceId
                            }),
                            relation: relation,
                            subject: v1.SubjectReference.create({
                                object: v1.ObjectReference.create({
                                    objectType: subjectType,
                                    objectId: subjectId
                                })
                            })
                        })
                    })
                ]
            });

            await this.client.writeRelationships(request);
            console.log(`Relationship deleted: ${subjectType}:${subjectId}#${relation}@${resourceType}:${resourceId}`);
        } catch (error) {
            console.error('Failed to delete relationship:', error);
            throw error;
        }
    }

    async readRelationships(resourceType, resourceId, relation = null) {
        try {
            const filter = {
                resourceType: resourceType,
                optionalResourceId: resourceId
            };
            if (relation) filter.optionalRelation = relation;

            const request = v1.ReadRelationshipsRequest.create({
                consistency: { requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true } },
                relationshipFilter: filter
            });

            const relationships = [];
            // readRelationships gibt einen Async-Stream zurück
            const stream = this.client.readRelationships(request);

            for await (const response of stream) {
                relationships.push({
                    resource: `${response.relationship.resource.objectType}:${response.relationship.resource.objectId}`,
                    relation: response.relationship.relation,
                    subject: `${response.relationship.subject.object.objectType}:${response.relationship.subject.object.objectId}`
                });
            }
            return relationships;
        } catch (error) {
            console.error('Failed to read relationships:', error);
            throw error;
        }
    }

    async lookupResources(userId, permission, resourceType) {
        try {
            const request = v1.LookupResourcesRequest.create({
                consistency: { requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true } },
                resourceObjectType: resourceType,
                permission: permission,
                subject: v1.SubjectReference.create({
                    object: v1.ObjectReference.create({
                        objectType: 'user',
                        objectId: userId
                    })
                })
            });

            const resourceIds = [];
            const stream = this.client.lookupResources(request);

            for await (const response of stream) {
                resourceIds.push(response.resourceObjectId);
            }
            console.log(`Lookup: user:${userId} can ${permission} ${resourceIds.length} ${resourceType}(s)`);
            return resourceIds;
        } catch (error) {
            console.error('Failed to lookup resources:', error);
            throw error;
        }
    }

    // Helper Methoden bleiben identisch
    async makeOrganizationAdmin(userId, organizationId) {
        await this.createRelationship('organization', organizationId, 'admin', 'user', userId);
    }
    async addTeamMember(userId, teamId) {
        await this.createRelationship('team', teamId, 'member', 'user', userId);
    }
    async linkTeamToOrganization(teamId, organizationId) {
        await this.createRelationship('team', teamId, 'parent_organization', 'organization', organizationId);
    }
    async linkProjectToTeam(projectId, teamId) {
        await this.createRelationship('project', projectId, 'parent_team', 'team', teamId);
    }
    async linkBoardToProject(boardId, projectId) {
        await this.createRelationship('board', boardId, 'parent_project', 'project', projectId);
    }
    async linkCardToBoard(cardId, boardId) {
        await this.createRelationship('card', cardId, 'parent_board', 'board', boardId);
    }
    async deleteAllRelationshipsForResource(resourceType, resourceId) {
        try {
            const relationships = await this.readRelationships(resourceType, resourceId);
            const updates = relationships.map(rel => {
                const [subjectType, subjectId] = rel.subject.split(':');
                return v1.RelationshipUpdate.create({
                    operation: v1.RelationshipUpdate_Operation.DELETE,
                    relationship: v1.Relationship.create({
                        resource: v1.ObjectReference.create({ objectType: resourceType, objectId: resourceId }),
                        relation: rel.relation,
                        subject: v1.SubjectReference.create({ object: v1.ObjectReference.create({ objectType: subjectType, objectId: subjectId }) })
                    })
                });
            });

            if (updates.length > 0) {
                const request = v1.WriteRelationshipsRequest.create({ updates });
                await this.client.writeRelationships(request);
                console.log(`Deleted ${updates.length} relationships for ${resourceType}:${resourceId}`);
            }
        } catch (error) {
            console.error('Failed to delete all relationships:', error);
            throw error;
        }
    }
}

let spiceDBServiceInstance = null;
function getSpiceDBService() {
    if (!spiceDBServiceInstance) spiceDBServiceInstance = new SpiceDBService();
    return spiceDBServiceInstance;
}

module.exports = { SpiceDBService, getSpiceDBService };