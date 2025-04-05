import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Title, Button, Group, Table, ActionIcon,
  Text, Card, Badge, Menu, Modal, TextInput, Textarea,
  Pagination as MantinePagination, Loader, Paper
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconEdit, IconTrash, IconDotsVertical, IconFolder } from '@tabler/icons-react';
import { Collection, BaseCollection } from '../types';
import { formatDateTime } from '../types';
import { models } from '../../wailsjs/go/models';

export function CollectionList() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [opened, { open, close }] = useDisclosure(false);
  const [editCollection, setEditCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState<BaseCollection>({
    name: '',
    description: '',
  });
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);

  // Load collections on component mount
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await window.go.main.App.GetAllCollections();
      setCollections(data || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = () => {
    setEditCollection(null);
    setFormData({
      name: '',
      description: '',
    });
    open();
  };

  const handleEditCollection = (collection: Collection) => {
    setEditCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description,
    });
    open();
  };

  const handleDeleteCollection = (collection: Collection) => {
    setCollectionToDelete(collection);
    setDeleteModalOpened(true);
  };

  const confirmDeleteCollection = async () => {
    if (!collectionToDelete) return;
    
    try {
      await window.go.main.App.DeleteCollection(collectionToDelete.id);
      await loadCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    } finally {
      setDeleteModalOpened(false);
      setCollectionToDelete(null);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editCollection) {
        // Update existing collection using the createFrom method
        const updateData = models.Collection.createFrom({
          ...editCollection,
          name: formData.name,
          description: formData.description,
        });
        await window.go.main.App.UpdateCollection(updateData);
      } else {
        // Create new collection using the createFrom method
        const newCollection = models.Collection.createFrom({
          id: 0,
          name: formData.name,
          description: formData.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await window.go.main.App.CreateCollection(newCollection);
      }
      
      await loadCollections();
      close();
    } catch (err) {
      console.error('Failed to save collection:', err);
    }
  };

  const handleViewAPIs = (collectionId: number) => {
    navigate(`/collections/${collectionId}`);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = collections.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(collections.length / itemsPerPage);

  if (loading) {
    return (
      <Container size="xl" p="md">
        <Group position="center" mt="xl">
          <Loader />
        </Group>
      </Container>
    );
  }

  return (
    <Container size="xl" p="md">
      <Group position="apart" mb="md">
        <Title order={2}>API Collections</Title>
        <Button 
          leftIcon={<IconPlus size={16} />} 
          onClick={handleCreateCollection}
        >
          Add Collection
        </Button>
      </Group>

      {collections.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text align="center">No collections found. Add your first collection to organize your APIs.</Text>
        </Paper>
      ) : (
        <>
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th>Last Updated</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((collection) => (
                <tr key={collection.id}>
                  <td>
                    <Group spacing="xs">
                      <IconFolder size={16} />
                      <Text weight={500}>{collection.name}</Text>
                    </Group>
                  </td>
                  <td>{collection.description}</td>
                  <td>{formatDateTime(collection.createdAt)}</td>
                  <td>{formatDateTime(collection.updatedAt)}</td>
                  <td>
                    <Group spacing={0} position="right">
                      <Menu shadow="md">
                        <Menu.Target>
                          <ActionIcon>
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item 
                            icon={<IconFolder size={16} />}
                            onClick={() => handleViewAPIs(collection.id)}
                          >
                            View APIs
                          </Menu.Item>
                          <Menu.Item 
                            icon={<IconEdit size={16} />}
                            onClick={() => handleEditCollection(collection)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item 
                            icon={<IconTrash size={16} />}
                            color="red"
                            onClick={() => handleDeleteCollection(collection)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <Group position="center" mt="md">
              <MantinePagination 
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
              />
            </Group>
          )}
        </>
      )}

      {/* Create/Edit Collection Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={editCollection ? "Edit Collection" : "Create Collection"}
        size="md"
      >
        <TextInput
          label="Name"
          placeholder="Collection Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          mb="md"
        />
        
        <Textarea
          label="Description"
          placeholder="Collection Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          mb="xl"
        />
        
        <Group position="right">
          <Button variant="default" onClick={close}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {editCollection ? "Update" : "Create"}
          </Button>
        </Group>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <Text mb="lg">
          Are you sure you want to delete the collection "{collectionToDelete?.name}"? 
          The APIs in this collection will not be deleted, but they will be removed from this collection.
        </Text>
        
        <Group position="right">
          <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDeleteCollection}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
} 